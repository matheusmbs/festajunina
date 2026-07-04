/**
 * Rodar no SQL Editor do Supabase antes de usar o app:
 *
 * -- 1. Todos os participantes (para verificação de reserva existente)
 * create or replace function listar_todos_participantes()
 * returns table (id bigint, nome text)
 * security definer set search_path = public
 * language sql as $$
 *   select id, nome from participantes order by nome;
 * $$;
 * grant execute on function listar_todos_participantes() to anon, authenticated;
 *
 * -- 2. Verificar se participante já reservou e qual item
 * create or replace function reserva_do_participante(p_participante bigint)
 * returns table (item text)
 * security definer set search_path = public
 * language sql as $$
 *   select it.nome
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
 * As funções `listar_itens_disponiveis()`, `listar_participantes_disponiveis()`
 * e `reservar(p_item, p_participante)` também precisam existir no banco — a
 * primeira retornando os itens com estoque > 0, a segunda os participantes
 * sem reserva, e a terceira criando a reserva de forma atômica e levantando
 * exceção com mensagem "Item esgotado" ou "Este participante ja reservou um
 * item" quando aplicável.
 */
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Item } from '../models/item.model';
import { Participante } from '../models/participante.model';
import { ReservaDoParticipante, ReservaResult } from '../models/reserva.model';
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

  async reservar(itemId: number, participanteId: number): Promise<ReservaResult> {
    const { data, error } = await this.client.rpc('reservar', {
      p_item: itemId,
      p_participante: participanteId,
    });
    if (error) throw error;
    return data as ReservaResult;
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
