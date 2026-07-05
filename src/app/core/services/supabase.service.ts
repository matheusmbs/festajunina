/**
 * Rodar no SQL Editor do Supabase antes de usar o app:
 *
 * -- 0. Migração: itens não têm mais estoque avulso — cada item é assumido
 * --    por um grupo fechado de N pessoas (tudo ou nada).
 * alter table itens rename column estoque to quantidade_pessoas;
 * alter table itens drop constraint if exists itens_estoque_check;
 * alter table itens add constraint itens_quantidade_pessoas_check check (quantidade_pessoas >= 1);
 *
 * -- 1. Todos os participantes (para o modal "já escolhi algo?")
 * create or replace function listar_todos_participantes()
 * returns table (id bigint, nome text)
 * security definer set search_path = public
 * language sql as $$
 *   select id, nome from participantes order by nome;
 * $$;
 * grant execute on function listar_todos_participantes() to anon, authenticated;
 *
 * -- 2. Verificar se participante já reservou, qual item, a descrição e quem
 * --    mais está no grupo daquele item
 * drop function if exists reserva_do_participante(bigint);
 * create or replace function reserva_do_participante(p_participante bigint)
 * returns table (item text, observacao text, participantes text[])
 * security definer set search_path = public
 * language sql as $$
 *   select it.nome, it.observacao,
 *     (select array_agg(p2.nome order by p2.nome)
 *      from reservas r2
 *      join participantes p2 on p2.id = r2.participante_id
 *      where r2.item_id = it.id)
 *   from reservas r
 *   join itens it on it.id = r.item_id
 *   where r.participante_id = p_participante;
 * $$;
 * grant execute on function reserva_do_participante(bigint) to anon, authenticated;
 *
 * -- 3. Relatório por participante
 * create or replace function relatorio_por_participante()
 * returns table (participante text, item text)
 * security definer set search_path = public
 * language sql as $$
 *   select p.nome, it.nome
 *   from participantes p
 *   left join reservas r  on r.participante_id = p.id
 *   left join itens it    on it.id = r.item_id
 *   order by p.nome;
 * $$;
 * grant execute on function relatorio_por_participante() to anon, authenticated;
 *
 * -- 4. Relatório por item
 * create or replace function relatorio_por_item()
 * returns table (item text, categoria text, participante text)
 * security definer set search_path = public
 * language sql as $$
 *   select it.nome, it.categoria, p.nome
 *   from itens it
 *   left join reservas r  on r.item_id = it.id
 *   left join participantes p on p.id = r.participante_id
 *   order by it.categoria, it.nome, p.nome;
 * $$;
 * grant execute on function relatorio_por_item() to anon, authenticated;
 *
 * -- 5. Itens ainda não assumidos por nenhum grupo
 * create or replace function listar_itens_disponiveis()
 * returns table (id bigint, nome text, categoria text, quantidade_pessoas int, observacao text)
 * security definer set search_path = public
 * language sql as $$
 *   select it.id, it.nome, it.categoria, it.quantidade_pessoas, it.observacao
 *   from itens it
 *   where not exists (select 1 from reservas r where r.item_id = it.id)
 *   order by it.categoria, it.nome;
 * $$;
 * grant execute on function listar_itens_disponiveis() to anon, authenticated;
 *
 * -- 6. Reservar um item para um GRUPO de participantes de uma vez (tudo ou nada)
 * create or replace function reservar(p_item bigint, p_participantes bigint[])
 * returns void
 * security definer set search_path = public
 * language plpgsql as $$
 * declare
 *   v_quantidade_esperada int;
 *   v_participante bigint;
 * begin
 *   select quantidade_pessoas into v_quantidade_esperada from itens where id = p_item;
 *
 *   if v_quantidade_esperada is null then
 *     raise exception 'Item inexistente';
 *   end if;
 *
 *   if array_length(p_participantes, 1) is distinct from v_quantidade_esperada then
 *     raise exception 'Quantidade de participantes incorreta';
 *   end if;
 *
 *   if exists (select 1 from reservas where item_id = p_item) then
 *     raise exception 'Item esgotado';
 *   end if;
 *
 *   begin
 *     foreach v_participante in array p_participantes loop
 *       insert into reservas (item_id, participante_id) values (p_item, v_participante);
 *     end loop;
 *   exception when unique_violation then
 *     raise exception 'Este participante ja reservou um item';
 *   end;
 * end;
 * $$;
 * grant execute on function reservar(bigint, bigint[]) to anon, authenticated;
 *
 * -- 7. listar_participantes_disponiveis() continua igual (participantes sem
 * --    nenhuma linha em reservas), não precisa mudar.
 */
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Item } from '../models/item.model';
import { Participante } from '../models/participante.model';
import { ReservaDoParticipante } from '../models/reserva.model';
import { RelatorioPorItem, RelatorioPorParticipante } from '../models/relatorio.model';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
  );

  async listarItensDisponiveis(): Promise<Item[]> {
    const { data, error } = await this.client.rpc('listar_itens_disponiveis');
    if (error) throw error;
    return (data ?? []) as Item[];
  }

  async listarParticipantesDisponiveis(): Promise<Participante[]> {
    const { data, error } = await this.client.rpc('listar_participantes_disponiveis');
    if (error) throw error;
    return (data ?? []) as Participante[];
  }

  async listarTodosParticipantes(): Promise<Participante[]> {
    const { data, error } = await this.client.rpc('listar_todos_participantes');
    if (error) throw error;
    return (data ?? []) as Participante[];
  }

  async reservar(itemId: number, participanteIds: number[]): Promise<void> {
    const { error } = await this.client.rpc('reservar', {
      p_item: itemId,
      p_participantes: participanteIds,
    });
    if (error) throw error;
  }

  async reservaDoParticipante(participanteId: number): Promise<ReservaDoParticipante | null> {
    const { data, error } = await this.client.rpc('reserva_do_participante', {
      p_participante: participanteId,
    });
    if (error) throw error;
    const linhas = (data ?? []) as ReservaDoParticipante[];
    return linhas.length > 0 ? linhas[0] : null;
  }

  async relatorioPorParticipante(): Promise<RelatorioPorParticipante[]> {
    const { data, error } = await this.client.rpc('relatorio_por_participante');
    if (error) throw error;
    return (data ?? []) as RelatorioPorParticipante[];
  }

  async relatorioPorItem(): Promise<RelatorioPorItem[]> {
    const { data, error } = await this.client.rpc('relatorio_por_item');
    if (error) throw error;
    return (data ?? []) as RelatorioPorItem[];
  }
}
