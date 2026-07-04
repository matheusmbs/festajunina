export interface ReservaDoParticipante {
  item: string;
}

/** Id (bigint) da reserva criada, retornado pela função RPC `reservar`. */
export type ReservaResult = number;
