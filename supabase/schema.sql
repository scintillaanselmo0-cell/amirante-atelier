-- =====================================================================
-- AMIRANTE ATELIER — Schema prenotazioni (Supabase / Postgres)
-- Compatibile con il gestionale multi-tenant "Scintilla".
-- Eseguire nel SQL Editor di Supabase.
-- =====================================================================

-- 1) TABELLA PRENOTAZIONI --------------------------------------------
create table if not exists public.prenotazioni (
  id           uuid primary key default gen_random_uuid(),
  tenant       text not null default 'amirante',
  tipo_servizio text not null,           -- 'sposa' | 'cerimonia' | 'uomo'
  tipo_label   text,
  durata_min   int  not null,
  data         date not null,
  ora_inizio   time not null,
  ora_fine     time not null,
  stato        text not null default 'in_attesa',  -- in_attesa | confermata | annullata
  nome         text not null,
  telefono     text not null,
  email        text,
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_pren_tenant_data
  on public.prenotazioni (tenant, data)
  where stato <> 'annullata';

-- 2) ROW LEVEL SECURITY ----------------------------------------------
alter table public.prenotazioni enable row level security;

-- Lettura pubblica dei SOLI campi orari serve al calendario per calcolare
-- gli slot liberi. Non esponiamo dati personali: creiamo una VISTA ridotta
-- e diamo l'accesso in lettura solo a quella.
create or replace view public.prenotazioni_occupate as
  select tenant, data, ora_inizio, ora_fine, stato
  from public.prenotazioni
  where stato <> 'annullata';

-- Nessuna policy di SELECT diretta sulla tabella (dati personali protetti).
-- Nessuna policy di INSERT diretta: si prenota SOLO tramite la funzione
-- book_slot (SECURITY DEFINER) che verifica la capienza in modo atomico.
-- (Lo staff usa la service_role / dashboard per leggere e gestire tutto.)

-- Concede lettura della vista occupata al ruolo anon (chiave pubblica).
grant select on public.prenotazioni_occupate to anon;

-- 3) FUNZIONE ATOMICA DI PRENOTAZIONE --------------------------------
-- Verifica la capienza (n. sale prova) sotto advisory lock e inserisce.
-- Ritorna { ok:true, id:... } oppure { ok:false, reason:... }.
create or replace function public.book_slot(
  p_tenant     text,
  p_tipo       text,
  p_tipo_label text,
  p_durata     int,
  p_data       date,
  p_ora_inizio time,
  p_ora_fine   time,
  p_capacity   int,
  p_nome       text,
  p_telefono   text,
  p_email      text,
  p_note       text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_id uuid;
begin
  -- serializza le prenotazioni concorrenti per lo stesso giorno/tenant
  perform pg_advisory_xact_lock(hashtextextended(p_tenant || p_data::text, 0));

  -- conta gli appuntamenti che si sovrappongono a questa fascia
  select count(*) into v_count
  from public.prenotazioni
  where tenant = p_tenant
    and data = p_data
    and stato <> 'annullata'
    and ora_inizio < p_ora_fine
    and ora_fine   > p_ora_inizio;

  if v_count >= p_capacity then
    return jsonb_build_object('ok', false, 'reason', 'slot pieno');
  end if;

  insert into public.prenotazioni
    (tenant, tipo_servizio, tipo_label, durata_min, data, ora_inizio, ora_fine,
     stato, nome, telefono, email, note)
  values
    (p_tenant, p_tipo, p_tipo_label, p_durata, p_data, p_ora_inizio, p_ora_fine,
     'in_attesa', p_nome, p_telefono, p_email, p_note)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- Permette la chiamata RPC con la chiave pubblica anon.
grant execute on function public.book_slot(
  text, text, text, int, date, time, time, int, text, text, text, text
) to anon;

-- =====================================================================
-- NOTA: la funzione legge la VISTA/ tabella completa perché è SECURITY
-- DEFINER (gira coi privilegi del proprietario), quindi il conteggio
-- capienza è corretto anche senza esporre i dati personali al client.
-- Per usare la vista pubblica anche in lettura dal frontend, in data.js
-- impostare booking.supabase.table = "prenotazioni_occupate".
-- =====================================================================
