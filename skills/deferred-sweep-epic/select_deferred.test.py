"""Test di select_deferred.py: `python3 skills/deferred-sweep-epic/select_deferred.test.py`.

Registri finti in una cartella temporanea, nelle tre forme viste in atala, subtxt e perimetro.
Lo script si chiama come lo chiama la skill, da riga di comando: si prova il contratto, non
le funzioni interne.
"""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("select_deferred.py")


def entry(dw, title, **fields):
    lines = [f"### DW-{dw}: {title}", ""]
    lines += [f"{k}: {v}" for k, v in fields.items()]
    return "\n".join(lines) + "\n\n"


# atala: storia nel `origin:` migrato, track RAW-31 con epic omonime, NUL nel file.
ATALA = (
    "# Deferred work\n\n"
    + entry(1, "Errori per-riga", status="open", severity="low",
            origin='migrated from legacy ledger ("Deferred from: code review of story '
                   '2-2-conferma-sostituzione (2026-07-16)", track RAW-31 Alloggiati), 2026-10-08')
    + entry(2, "Lotto vuoto", status="open", severity="medium",
            origin='migrated from legacy ledger ("Deferred from: code review of story '
                   '2-4-lotto-vuoto (2026-07-20)", track LEGACY presence-manager), 2026-10-08')
    + entry(3, "PR della 2", status="open", severity="high",
            origin='migrated from legacy ledger ("Deferred from: code review della PR #40 '
                   '— Epic 2 (2026-07-21)", track LEGACY presence-manager), 2026-10-08')
    + entry(4, "Citata nel motivo", status="open", severity="low",
            origin="spec-deferred abc123", reason="nasce dal lavoro dell'epic 2, non scritto altrove")
    + entry(5, "Chiusa", status="done 2026-11-01", resolution="fatto",
            origin="spec-deferred def456", source_spec="`spec-2-1-cosa.md`")
    + entry(6, "Due epic", status="open", severity="low",
            origin="review congiunta di spec-2-3 e spec-5-1", source_spec="`spec-2-3-x.md`")
    + "\x00\x00 byte NUL come nel registro vero\n"
)

# subtxt: `source_spec:` con la spec della storia, `origin:` libero in italiano.
SUBTXT = (
    entry(25, "Cache a 1h prezzata a 5m", status="open", severity="medium",
          origin="spec-deferred 2858b401da53", source_spec="`spec-9-2-costo-della-cache.md`")
    + entry(27, "Prova a mano", status="open", severity="low",
            origin="prova a mano dell'Epic 9 (9.2, D1), 2026-11-21", source_spec="nessuna")
    + entry(23, "Soniox", status="open", severity="low",
            origin="review di spec-soniox-v6, 2026-11-20", source_spec="`spec-soniox-v6.md`")
)

# perimetro: «epica» in italiano e rinvii nati da rinvii, anche su due livelli.
PERIMETRO = (
    entry(19, "Prova in locale", status="open", severity="low",
          origin="prova dell'epica 3 in locale, 2026-10-07", source_spec="nessuna")
    + entry(24, "Ripresa automatica", status="done 2026-10-27", resolution="fatto",
            origin="spec-deferred 111", source_spec="`spec-4-2-ripresa.md`")
    + entry(35, "Limite della ripresa", status="open", severity="low",
            origin="spec-deferred 222", source_spec="`spec-4-3-limite.md`")
    + entry(44, "Dalla review del bundle", status="open", severity="low",
            origin="review di bmad-build su DW-24 e DW-35 (2026-10-27)",
            source_spec="`spec-dw-24-dw-35-la-ripresa-automatica.md`")
    + entry(60, "Figlia della 44", status="open", severity="low",
            origin="review di DW-44 (2026-10-30)", source_spec="none")
    + entry(46, "Review della PR", status="open", severity="low",
            origin="review della PR #12 (2026-10-28)",
            source_spec="`spec-pr-12-correzioni-dopo-la-review.md`")
    + entry(61, "Ciclo", status="open", severity="low", origin="review di DW-62")
    + entry(62, "Ciclo", status="open", severity="low", origin="review di DW-61")
)


class SelectDeferred(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def ledger(self, text):
        path = Path(self.tmp.name) / "deferred-work.md"
        path.write_bytes(text.encode("utf-8"))
        return path

    def run_script(self, *args):
        return subprocess.run(
            [sys.executable, "-I", str(SCRIPT), *map(str, args)],
            capture_output=True, text=True,
        )

    def section(self, out, name):
        """Gli id elencati sotto `## <name> (n)`, fino alla sezione dopo."""
        ids, inside = [], False
        for line in out.splitlines():
            if line.startswith("## "):
                inside = line.startswith(f"## {name} (")
                continue
            if inside and line.startswith("DW-"):
                ids.append(line.split("\t")[0])
        return ids

    def ids_line(self, out):
        line = next(l for l in out.splitlines() if l.startswith("ids certe:"))
        rest = line.removeprefix("ids certe:").strip()
        return rest.split(",") if rest else []

    # --- atala -------------------------------------------------------------

    def test_storia_nell_origin_e_epic_con_spazio_sono_certe(self):
        r = self.run_script(2, "--ledger", self.ledger(ATALA), "--exclude", "track RAW-31")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.section(r.stdout, "certe"), ["DW-2", "DW-3", "DW-6"])

    def test_il_track_escluso_non_entra_ed_e_contato(self):
        r = self.run_script(2, "--ledger", self.ledger(ATALA), "--exclude", "track RAW-31")
        self.assertNotIn("DW-1", r.stdout.split("ids certe:")[0])
        self.assertIn("Escluse da --exclude: 1", r.stdout)

    def test_senza_esclusione_il_track_omonimo_entra(self):
        r = self.run_script(2, "--ledger", self.ledger(ATALA))
        self.assertIn("DW-1", self.section(r.stdout, "certe"))

    def test_epic_citata_solo_nel_motivo_e_dubbia(self):
        r = self.run_script(2, "--ledger", self.ledger(ATALA), "--exclude", "track RAW-31")
        self.assertEqual(self.section(r.stdout, "dubbie"), ["DW-4"])
        self.assertNotIn("DW-4", self.ids_line(r.stdout))

    def test_le_voci_chiuse_non_entrano(self):
        r = self.run_script(2, "--ledger", self.ledger(ATALA))
        self.assertNotIn("DW-5", r.stdout)

    def test_voce_di_due_epic_lo_dice(self):
        r = self.run_script(2, "--ledger", self.ledger(ATALA), "--exclude", "track RAW-31")
        line = next(l for l in r.stdout.splitlines() if l.startswith("DW-6\t"))
        self.assertIn("anche epic 5", line)

    def test_riga_degli_id_per_lo_sweep(self):
        r = self.run_script(2, "--ledger", self.ledger(ATALA), "--exclude", "track RAW-31")
        self.assertEqual(self.ids_line(r.stdout), ["DW-2", "DW-3", "DW-6"])

    # --- subtxt ------------------------------------------------------------

    def test_spec_della_storia_ed_epic_maiuscola_in_origin(self):
        r = self.run_script(9, "--ledger", self.ledger(SUBTXT))
        self.assertEqual(self.section(r.stdout, "certe"), ["DW-25", "DW-27"])

    def test_voce_senza_epic_e_contata_come_orfana(self):
        r = self.run_script(9, "--ledger", self.ledger(SUBTXT))
        self.assertIn("Di nessuna epic: 1 voci aperte (DW-23)", r.stdout)

    # --- perimetro ---------------------------------------------------------

    def test_epica_in_italiano(self):
        r = self.run_script(3, "--ledger", self.ledger(PERIMETRO))
        self.assertEqual(self.section(r.stdout, "certe"), ["DW-19"])

    def test_rinvio_nato_da_un_rinvio_eredita_l_epic(self):
        r = self.run_script(4, "--ledger", self.ledger(PERIMETRO))
        self.assertEqual(self.section(r.stdout, "certe"), ["DW-35", "DW-44", "DW-60"])

    def test_la_catena_si_dichiara(self):
        r = self.run_script(4, "--ledger", self.ledger(PERIMETRO))
        line = next(l for l in r.stdout.splitlines() if l.startswith("DW-60\t"))
        self.assertIn("via DW-44", line)

    def test_review_di_una_pr_senza_epic_resta_orfana(self):
        r = self.run_script(4, "--ledger", self.ledger(PERIMETRO))
        orphans = next(l for l in r.stdout.splitlines() if l.startswith("Di nessuna epic:"))
        self.assertIn("DW-46", orphans)

    def test_un_ciclo_di_rimandi_non_blocca(self):
        r = self.run_script(4, "--ledger", self.ledger(PERIMETRO))
        self.assertEqual(r.returncode, 0, r.stderr)
        orphans = next(l for l in r.stdout.splitlines() if l.startswith("Di nessuna epic:"))
        self.assertIn("DW-61", orphans)
        self.assertIn("DW-62", orphans)

    # --- rinvii nati da un gruppo di uno sweep, senza numero nella spec -------

    def runs_dir(self, bundles):
        run = Path(self.tmp.name) / "runs" / "20261110-132040-2aab"
        run.mkdir(parents=True)
        (run / "triage.json").write_text(json.dumps({"bundles": bundles}))
        return run.parent

    def test_spec_di_un_gruppo_senza_numero_risale_ai_dw_dal_triage(self):
        ledger = self.ledger(PERIMETRO + entry(
            70, "Dal gruppo", status="open", severity="low", origin="spec-deferred 333",
            source_spec="`spec-dw-ripresa-con-limite.md`"))
        runs = self.runs_dir([{"name": "ripresa-con-limite", "dw_ids": ["DW-35"]}])
        r = self.run_script(4, "--ledger", ledger, "--runs", runs)
        line = next(l for l in r.stdout.splitlines() if l.startswith("DW-70\t"))
        self.assertIn("via DW-35", line)

    def test_senza_i_triage_la_spec_del_gruppo_resta_orfana(self):
        ledger = self.ledger(PERIMETRO + entry(
            70, "Dal gruppo", status="open", severity="low", origin="spec-deferred 333",
            source_spec="`spec-dw-ripresa-con-limite.md`"))
        r = self.run_script(4, "--ledger", ledger, "--runs", Path(self.tmp.name) / "manca")
        self.assertEqual(r.returncode, 0, r.stderr)
        orphans = next(l for l in r.stdout.splitlines() if l.startswith("Di nessuna epic:"))
        self.assertIn("DW-70", orphans)

    def test_un_triage_illeggibile_non_ferma_lo_script_ma_lo_dice(self):
        runs = Path(self.tmp.name) / "runs" / "rotto"
        runs.mkdir(parents=True)
        (runs / "triage.json").write_text("{non json")
        r = self.run_script(4, "--ledger", self.ledger(PERIMETRO), "--runs", runs.parent)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("triage illeggibile", r.stderr)

    def test_un_gruppo_malformato_non_butta_gli_altri(self):
        ledger = self.ledger(PERIMETRO + entry(
            70, "Dal gruppo", status="open", severity="low", origin="spec-deferred 333",
            source_spec="`spec-dw-ripresa-con-limite.md`"))
        runs = self.runs_dir(["stringa", {"dw_ids": ["DW-19"]},
                              {"name": "ripresa-con-limite", "dw_ids": ["DW-35"]}])
        r = self.run_script(4, "--ledger", ledger, "--runs", runs)
        self.assertIn("DW-70", self.section(r.stdout, "certe"))

    def test_lo_stesso_nome_di_gruppo_in_due_giri_vale_l_ultimo(self):
        ledger = self.ledger(PERIMETRO + entry(
            70, "Dal gruppo", status="open", severity="low", origin="spec-deferred 333",
            source_spec="`spec-dw-ripresa.md`"))
        root = Path(self.tmp.name) / "runs"
        for run, ids in (("20261101-000000-aaaa", ["DW-19"]), ("20261102-000000-bbbb", ["DW-35"])):
            (root / run).mkdir(parents=True)
            (root / run / "triage.json").write_text(
                json.dumps({"bundles": [{"name": "ripresa", "dw_ids": ids}]}))
        r = self.run_script(4, "--ledger", ledger, "--runs", root)
        line = next(l for l in r.stdout.splitlines() if l.startswith("DW-70\t"))
        self.assertIn("via DW-35", line)
        self.assertNotIn("DW-19", line)

    def test_un_gruppo_che_comincia_con_una_cifra_non_e_un_dw(self):
        ledger = self.ledger(PERIMETRO + entry(
            2, "Una voce qualsiasi", status="done 2026-10-01", origin="x",
            source_spec="`spec-9-1-altro.md`") + entry(
            70, "Dal gruppo", status="open", severity="low", origin="spec-deferred 333",
            source_spec="`spec-dw-2fa-hardening.md`"))
        r = self.run_script(9, "--ledger", ledger)
        self.assertNotIn("DW-70", self.section(r.stdout, "certe"))

    # --- la nota «via» -----------------------------------------------------

    def test_via_nomina_solo_i_rimandi_che_portano_l_epic(self):
        ledger = self.ledger(PERIMETRO + entry(
            71, "Da due voci", status="open", severity="low",
            origin="review di DW-46 e DW-35 (2026-10-30)"))
        r = self.run_script(4, "--ledger", ledger)
        line = next(l for l in r.stdout.splitlines() if l.startswith("DW-71\t"))
        self.assertIn("via DW-35", line)
        self.assertNotIn("DW-46", line)

    def test_un_rimando_escluso_non_passa_l_epic(self):
        ledger = self.ledger(PERIMETRO + entry(
            72, "Da una voce esclusa", status="open", severity="low",
            origin="review di DW-35 (2026-10-30)"))
        text = ledger.read_text().replace("origin: spec-deferred 222",
                                          "origin: spec-deferred 222, track VECCHIO")
        ledger.write_text(text)
        r = self.run_script(4, "--ledger", ledger, "--exclude", "track VECCHIO")
        self.assertNotIn("DW-72", self.section(r.stdout, "certe"))

    # --- forme del registro --------------------------------------------------

    def test_nul_davanti_all_intestazione_non_perde_la_voce(self):
        text = SUBTXT.replace("### DW-27:", "\x00\x00### DW-27:")
        r = self.run_script(9, "--ledger", self.ledger(text))
        self.assertIn("DW-27", self.section(r.stdout, "certe"))

    def test_intestazione_senza_titolo(self):
        text = SUBTXT.replace("### DW-27: Prova a mano", "### DW-27:")
        r = self.run_script(9, "--ledger", self.ledger(text))
        self.assertIn("DW-27", self.section(r.stdout, "certe"))

    def test_una_sezione_chiude_la_voce(self):
        text = (entry(30, "Senza epic", status="open", severity="low", origin="nessuna")
                + "## Note\n\nsource_spec: `spec-9-1-x.md`\n")
        r = self.run_script(9, "--ledger", self.ledger(text))
        self.assertNotIn("DW-30", self.section(r.stdout, "certe"))

    def test_un_tab_nel_titolo_non_rompe_le_colonne(self):
        text = SUBTXT.replace("Prova a mano", "Prova\ta mano")
        r = self.run_script(9, "--ledger", self.ledger(text))
        line = next(l for l in r.stdout.splitlines() if l.startswith("DW-27\t"))
        self.assertEqual(line.split("\t")[2], "Prova a mano")

    def test_una_data_seguita_da_lettere_non_e_un_epic(self):
        text = entry(40, "Data", status="open", severity="low", origin="nota 2026-11-21-sera")
        r = self.run_script(11, "--ledger", self.ledger(text))
        self.assertNotIn("DW-40", self.section(r.stdout, "certe"))

    def test_exclude_vuoto_e_un_errore_d_uso(self):
        r = self.run_script(9, "--ledger", self.ledger(SUBTXT), "--exclude", "")
        self.assertEqual(r.returncode, 2)

    # --- decisioni già prese -----------------------------------------------

    def test_una_decisione_gia_presa_si_vede_sulla_riga(self):
        ledger = self.ledger(SUBTXT.replace(
            "status: open\nseverity: medium",
            "status: open\ndecision: 2026-11-20 keep-open — non-lavoro, la cache resta a 5m\n"
            "severity: medium", 1))
        r = self.run_script(9, "--ledger", ledger)
        line = next(l for l in r.stdout.splitlines() if l.startswith("DW-25\t"))
        self.assertIn("decision: 2026-11-20 keep-open", line)

    # --- errori ------------------------------------------------------------

    def test_nessuna_voce_dw_si_ferma(self):
        r = self.run_script(2, "--ledger", self.ledger("- source_spec: `x`\n  summary: y\n"))
        self.assertEqual(r.returncode, 1)
        self.assertIn("### DW-", r.stderr)

    def test_registro_assente_si_ferma(self):
        r = self.run_script(2, "--ledger", Path(self.tmp.name) / "manca.md")
        self.assertEqual(r.returncode, 1)

    def test_epic_non_numerica_e_un_errore_d_uso(self):
        r = self.run_script("dieci", "--ledger", self.ledger(ATALA))
        self.assertEqual(r.returncode, 2)

    def test_nessuna_certa_lascia_vuota_la_riga_degli_id(self):
        r = self.run_script(7, "--ledger", self.ledger(SUBTXT))
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.ids_line(r.stdout), [])

    # --- azioni della retro nella board -------------------------------------

    def board(self, text):
        path = Path(self.tmp.name) / "sprint-status.yaml"
        path.write_text(text, encoding="utf-8")
        return path

    def retro_line(self, out, prefix):
        return next(l for l in out.splitlines() if l.startswith(prefix))

    def with_board(self, epic, ledger_text, board_text):
        return self.run_script(epic, "--ledger", self.ledger(ledger_text),
                               "--board", self.board(board_text))

    def test_azione_della_retro_non_ancora_nel_registro_si_segnala(self):
        r = self.with_board(9, SUBTXT, BOARD)
        self.assertEqual(r.returncode, 0, r.stderr)
        line = self.retro_line(r.stdout, "Retro da copiare nel registro:")
        self.assertIn("1 ", line)
        self.assertIn("epic-9-retro-item-2-armare-la-ci", line)

    def test_azione_gia_nel_registro_non_si_segnala_anche_se_chiusa(self):
        ledger = SUBTXT + entry(90, "Armare la CI", status="done 2026-11-22", resolution="fatto",
                                origin="retro action item epic-9-retro-item-2-armare-la-ci")
        r = self.with_board(9, ledger, BOARD)
        self.assertIn("Retro da copiare nel registro: 0",
                      self.retro_line(r.stdout, "Retro da copiare nel registro:"))

    def test_azione_done_o_di_un_altra_epic_non_si_segnala(self):
        r = self.with_board(9, SUBTXT, BOARD)
        line = self.retro_line(r.stdout, "Retro da copiare nel registro:")
        self.assertNotIn("epic-9-retro-item-1-fatta", line)
        self.assertNotIn("epic-8-retro-item", line)

    def test_l_epic_si_ricava_dall_id_se_manca_il_campo(self):
        r = self.with_board(10, SUBTXT, BOARD)
        self.assertIn("epic-10-retro-item-1-senza-campo",
                      self.retro_line(r.stdout, "Retro da copiare nel registro:"))

    def test_azioni_senza_id_si_contano_a_parte(self):
        r = self.with_board(11, SUBTXT, BOARD)
        self.assertIn("Retro da copiare nel registro: 0",
                      self.retro_line(r.stdout, "Retro da copiare nel registro:"))
        self.assertIn("2", self.retro_line(r.stdout, "Retro senza id"))

    def test_board_assente_lo_dice_e_non_ferma(self):
        r = self.run_script(9, "--ledger", self.ledger(SUBTXT),
                            "--board", Path(self.tmp.name) / "manca.yaml")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("board non trovata", r.stdout)
        self.assertIn("ids certe:", r.stdout)

    def test_una_continuazione_che_comincia_col_trattino_non_e_un_elemento(self):
        board = BOARD.replace('    action: "Gia fatta"\n',
                              '    action: "Gia fatta, guarda i file\n      - non il budget"\n')
        r = self.with_board(9, SUBTXT, board)
        line = self.retro_line(r.stdout, "Retro da copiare nel registro:")
        self.assertIn("Retro da copiare nel registro: 1 ", line)
        self.assertNotIn("fatta", line)

    def test_un_commento_in_coda_allo_stato_non_lo_cambia(self):
        board = BOARD.replace("    status: Done\n", "    status: done  # 2026-08-16: fatto\n")
        r = self.with_board(9, SUBTXT, board)
        self.assertNotIn("epic-9-retro-item-1-fatta",
                         self.retro_line(r.stdout, "Retro da copiare nel registro:"))

    def test_board_senza_action_items_dice_zero(self):
        r = self.with_board(9, SUBTXT, "development_status:\n  epic-9: done\n")
        self.assertIn("Retro da copiare nel registro: 0",
                      self.retro_line(r.stdout, "Retro da copiare nel registro:"))


# subtxt e atala: azioni con id (subtxt), senza id (atala), una done, una di un'altra epic.
BOARD = """\
development_status:
  epic-9: done
action_items:
  - id: "epic-9-retro-item-1-fatta"
    epic: 9
    action: "Gia fatta"
    status: Done
  - id: "epic-9-retro-item-2-armare-la-ci"
    epic: 9
    action: "Armare la CI: push di feat/epic-9,
      job Linux verde"
    owner: "Dani"
    status: open
  - id: "epic-8-retro-item-1-altra-epic"
    epic: 8
    action: "Di un'altra epic"
    status: open
  - id: epic-10-retro-item-1-senza-campo
    action: "Epic solo nell'id"
    status: open
  - epic: 11
    action: "Senza id, come in atala"
    status: open
  - epic: 11
    action: "Senza id, seconda"
    owner: "Architect/dani"
    status: open
other_key: 1
"""


if __name__ == "__main__":
    unittest.main(verbosity=1)
