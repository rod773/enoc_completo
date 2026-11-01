import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC_BOOK = process.env.ENOC_BOOK_DIR || "D:/Descargas/El Libro de Enoc completo";
const PDF = path.join(SRC_BOOK, "El Libro de Enoc completo.pdf");
const PAGES_SRC = path.join(SRC_BOOK, "paginas");

const OUT_TEXT = path.join(ROOT, "data", "textos");
const OUT_DATA = path.join(ROOT, "public", "data");
const OUT_IMG = path.join(ROOT, "public", "paginas");

const BOOK_TITLES = {
  1: "Los Vigilantes",
  2: "Las parábolas",
  3: "El Libro de Noé",
  4: "El Reino de los Cielos",
  5: "Epístola de Enoc",
};

const EXTRAS_TITLES = [
  { id: "rollos-mar-muerto", title: "Los Rollos del Mar Muerto", re: /^los rollos del mar muerto$/i },
  { id: "libro-gigantes", title: "El Libro de los Gigantes", re: /^el libro de los gigantes$/i },
  { id: "evidencia-gigantes", title: "Evidencia de gigantes", re: /^evidencia de gigantes$/i },
  { id: "testamento-salomon", title: "Testamento de Salomón", re: /^testamento de salom[oó]n$/i },
  { id: "referencias-enoc", title: "Referencias a Enoc en otros manuscritos", re: /^referencias externas a enoc$/i },
  {
    id: "gigantes-resumen",
    title: "Resumen reconstruido del Libro de Gigantes",
    re: /^resumen reconstruido del libro de gigantes$/i,
  },
];

const VERSE_EXTRAS = new Set(["testamento-salomon", "referencias-enoc"]);

const FRONT_HEADINGS = [
  "Portada del libro electrónico",
  "Página de título",
  "Derechos de autor",
  "Tabla de contenido",
];

const ROMAN_NUMERALS = {
  UNO: 1, DOS: 2, TRES: 3, CUATRO: 4, CINCO: 5, SEIS: 6,
  SIETE: 7, OCHO: 8, NUEVE: 9, DIEZ: 10, ONCE: 11, DOCE: 12,
};

const SMALL_WORDS = new Set(["y", "de", "del", "la", "el", "los", "las", "en", "a", "con", "por", "un", "una", "al"]);

function extractPages() {
  const tmp = path.join(os.tmpdir(), "enoc_full_clean.txt");
  execFileSync("pdftotext", ["-enc", "UTF-8", PDF, tmp], { stdio: ["ignore", "ignore", "ignore"] });
  const raw = fs.readFileSync(tmp, "utf8");
  const pages = raw.split("\f");
  while (pages.length && !pages[pages.length - 1].trim()) pages.pop();
  return pages;
}

function normalize(text) {
  const lines = text.replace(/\u00ad/g, "-").split("\n");
  const out = [];
  for (const line of lines) {
    const prev = out.length ? out[out.length - 1] : null;
    if (prev !== null && /[a-záéíóúñ]-\s*$/.test(prev) && /^[a-záéíóúñ]/.test(line)) {
      out[out.length - 1] = prev.replace(/-\s*$/, "") + line;
    } else {
      out.push(line);
    }
  }
  return out.join("\n");
}

// Correcciones ortográficas/typográficas de erratas conocidas del PDF fuente.
function fixTypos(text) {
  let t = text;
  t = t.replace(/([¿¡])\s+/g, "$1"); // espacio tras signo invertido
  t = t.replace(/\s+([,;:])/g, "$1"); // espacio antes de , ; :
  t = t.replace(/\s+([?!])(?![\p{L}])/gu, "$1"); // espacio antes de ? ! (no pegado a letra)
  t = t.replace(/\b([\p{L}]{2,})\s+\1\b/giu, "$1"); // palabra repetida inmediata
  return t;
}

function titleCase(s) {
  return s
    .toLowerCase()
    .split(/(\s+)/)
    .map((tok) => {
      if (!tok.trim()) return tok;
      const word = tok.replace(/[^\p{L}\p{N}]/gu, "");
      if (word && SMALL_WORDS.has(word)) return tok;
      return tok.replace(/^\S/, (c) => c.toUpperCase());
    })
    .join("");
}

function cleanHeading(s) {
  let t = s.trim().replace(/^[\[(]+/, "").replace(/[\])]+$/, "").trim();
  const cap = t.match(/^(CAP[IÍ]TULO)\s+(.+)$/i);
  if (cap) {
    const first = cap[2].trim().split(":")[0].trim().toUpperCase();
    const num = ROMAN_NUMERALS[first];
    return num ? `Capítulo ${num}` : `Capítulo ${titleCase(first)}`;
  }
  return t;
}

function isCapsHeading(s) {
  if (!s || s.length > 95) return false;
  if (!/^[A-ZÁÉÍÓÚÜÑ0-9 \[\](),/:;.\-¿¡!"']+$/.test(s)) return false;
  if (!/[AEIOUÁÉÍÓÚ]/.test(s)) return false;
  if (/^ISBN\b/.test(s)) return false;
  return true;
}

function build() {
  const pages = extractPages();
  console.log(`Páginas extraídas: ${pages.length}`);

  for (const dir of [OUT_TEXT, OUT_DATA, OUT_IMG]) fs.rmSync(dir, { recursive: true, force: true });
  for (const dir of [OUT_TEXT, OUT_DATA, OUT_IMG]) fs.mkdirSync(dir, { recursive: true });

  const cleanPages = pages.map((p) => normalize(p));
  cleanPages.forEach((p, i) => {
    const n = String(i + 1).padStart(3, "0");
    fs.writeFileSync(path.join(OUT_TEXT, `pagina_${n}.txt`), p, "utf8");
  });

  if (fs.existsSync(PAGES_SRC)) {
    fs.cpSync(PAGES_SRC, OUT_IMG, { recursive: true });
    console.log(`Imágenes copiadas: ${fs.readdirSync(OUT_IMG).length}`);
  }

  const sections = [];
  let sec = null;
  let chap = null;
  let verse = null;
  let para = null;
  let lastNum = 0;
  let verseEnabled = false;
  let curPage = 1;
  let pendingCaps = null;

  function flushChapter() {
    if (chap && chap.units.length === 0 && sec) sec.chapters.pop();
    chap = null;
    verse = null;
    para = null;
    lastNum = 0;
  }

  function newSection(meta) {
    flushChapter();
    sec = { ...meta, chapters: [] };
    sections.push(sec);
  }

  function newChapter(meta) {
    flushChapter();
    if (!sec) return;
    chap = { id: `${sec.id}-c${sec.chapters.length + 1}`, units: [], ...meta };
    sec.chapters.push(chap);
  }

  function pushProse(text) {
    if (!text.trim() || !chap) return;
    if (para) {
      para.text = `${para.text} ${text}`.replace(/\s+/g, " ").trim();
    } else {
      para = { n: null, text: text.trim(), page: curPage };
      chap.units.push(para);
    }
  }

  function startVerse(n, text) {
    verse = { n, text: text.trim(), page: curPage };
    chap.units.push(verse);
    para = null;
    lastNum = n;
  }

  function verseMatch(line) {
    const m = line.match(/^(\d{1,3})\.?\s+(.*)$/);
    if (!m) return null;
    const n = Number(m[1]);
    if (n > 400) return null;
    const ok = lastNum === 0 ? n === 1 : n === lastNum + 1 || (n > lastNum && n - lastNum <= 3);
    if (!ok) return null;
    if (!/^[\p{Lu}\p{N}"«¡¿(]/u.test(m[2])) return null;
    return { n, text: m[2] };
  }

  function handleCapsHeading(line) {
    if (!sec || sec.kind !== "extra") return;
    let title = line;
    let rest = "";
    const idx = line.indexOf(":");
    if (idx > 0 && /^CAP[IÍ]TULO/i.test(line)) {
      title = line.slice(0, idx).trim();
      rest = line.slice(idx + 1).trim();
    }
    newChapter({ title: titleCase(cleanHeading(title)), page: curPage });
    verseEnabled = false;
    if (rest) pushProse(rest);
  }

  newSection({ id: "preliminares", kind: "front", title: "Portada, copyright e índice", page: 1 });
  newChapter({ title: "Portada y copyright", page: 1 });

  pages.forEach((rawPage, idx) => {
    curPage = idx + 1;
    const lines = normalize(rawPage).split("\n").map((l) => l.trim());

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!line) {
        para = null;
        continue;
      }

      if (pendingCaps) {
        const isNextCaps = isCapsHeading(line);
        const merged = isNextCaps ? `${pendingCaps} ${line}` : pendingCaps;
        pendingCaps = null;
        const extra = EXTRAS_TITLES.find((e) => e.re.test(merged));
        if (extra) applyExtraSection(extra);
        else handleCapsHeading(merged);
        if (isNextCaps) continue;
      }

      const bookMatch = line.match(/^Libro\s+([1-5]):\s*(.+)$/);
      if (bookMatch) {
        const num = Number(bookMatch[1]);
        newSection({ id: `libro-${num}`, kind: "book", num, title: BOOK_TITLES[num], page: curPage });
        verseEnabled = true;
        continue;
      }

      if (sec && sec.kind === "book") {
        const capMatch = line.match(/^Cap[íi]tulo\s+(\d+)$/);
        if (capMatch) {
          const num = Number(capMatch[1]);
          let subtitle = "";
          const next = lines[i + 1];
          const nextIsText =
            next &&
            next.trim() &&
            !/^Cap[íi]tulo\s+\d+$/.test(next) &&
            !/^Libro\s+\d+:/.test(next) &&
            !/^\d{1,3}\.?\s/.test(next);
          if (nextIsText) {
            subtitle = next.trim();
            i += 1;
          }
          newChapter({ num, title: subtitle || `Capítulo ${num}`, subtitle, page: curPage });
          verseEnabled = true;
          continue;
        }
      }

      if (/^Acerca del Libro de Enoc$/i.test(line) && (!sec || sec.kind === "front")) {
        newSection({ id: "acerca", kind: "front", title: "Acerca del Libro de Enoc", page: curPage });
        let subtitle = "";
        if (lines[i + 1] && /^\(/.test(lines[i + 1])) {
          subtitle = lines[i + 1].trim();
          i += 1;
        }
        newChapter({ title: "Acerca del Libro de Enoc", subtitle, page: curPage });
        verseEnabled = false;
        continue;
      }

      if (FRONT_HEADINGS.includes(line) && (!sec || sec.kind === "front")) {
        newChapter({ title: line, page: curPage });
        verseEnabled = false;
        continue;
      }

      const extra = sec && (sec.kind === "book" || sec.kind === "extra")
        ? EXTRAS_TITLES.find((e) => e.re.test(line))
        : null;
      if (extra) {
        applyExtraSection(extra);
        continue;
      }

      if (sec && sec.kind === "extra") {
        const capWord = line.match(/^CAP[IÍ]TULO\s+([A-ZÁÉÍÓÚ]+)\s*:\s*(.*)$/);
        if (capWord) {
          const n = ROMAN_NUMERALS[capWord[1]];
          newChapter({ num: n, title: n ? `Capítulo ${n}` : titleCase(capWord[1]), page: curPage });
          verseEnabled = false;
          if (capWord[2]) pushProse(capWord[2]);
          continue;
        }
        if (isCapsHeading(line)) {
          if (/\b(DE|DEL|LA|EL|LOS|LAS|Y|CON|EN|A)$/.test(line)) {
            pendingCaps = line;
            continue;
          }
          handleCapsHeading(line);
          continue;
        }
      }

      if (verseEnabled) {
        const v = verseMatch(line);
        if (v) {
          startVerse(v.n, v.text);
          continue;
        }
      }

      if (verseEnabled && verse) {
        verse.text = `${verse.text} ${line}`.replace(/\s+/g, " ").trim();
      } else {
        pushProse(line);
      }
    }

    para = null;
  });

  function applyExtraSection(extra) {
    newSection({ id: extra.id, kind: "extra", title: extra.title, page: curPage });
    newChapter({ title: "Texto", page: curPage });
    verseEnabled = VERSE_EXTRAS.has(extra.id);
  }

  flushChapter();

  // Aplicar correcciones ortográficas a todo el contenido antes de serializar.
  for (const s of sections) {
    if (s.title) s.title = fixTypos(s.title);
    for (const c of s.chapters) {
      if (c.title) c.title = fixTypos(c.title);
      if (c.subtitle) c.subtitle = fixTypos(c.subtitle);
      for (const u of c.units) u.text = fixTypos(u.text);
    }
  }

  const usable = sections.filter((s) => s.chapters.length > 0);
  const dropped = sections.filter((s) => s.chapters.length === 0).map((s) => s.id);
  if (dropped.length) console.log(`Secciones descartadas (sin contenido): ${dropped.join(", ")}`);

  const index = {
    title: "El Libro Completo de Enoc",
    subtitle: "Versión estándar — Dr. Jay Winter",
    sections: usable.map((s) => ({
      id: s.id,
      kind: s.kind,
      num: s.num,
      title: s.title,
      page: s.page,
      chapters: s.chapters.map((c) => ({
        id: c.id,
        num: c.num,
        title: c.title,
        subtitle: c.subtitle && c.subtitle !== c.title ? c.subtitle : undefined,
        page: c.page,
        count: c.units.length,
      })),
    })),
  };

  fs.writeFileSync(path.join(OUT_DATA, "index.json"), JSON.stringify(index), "utf8");
  for (const s of usable) {
    fs.writeFileSync(
      path.join(OUT_DATA, `${s.id}.json`),
      JSON.stringify({ id: s.id, kind: s.kind, title: s.title, chapters: s.chapters }),
      "utf8"
    );
  }

  console.log(
    usable
      .map((s) => {
        const units = s.chapters.reduce((a, c) => a + c.units.length, 0);
        return `  ${s.id}: ${s.chapters.length} cap., ${units} unidades`;
      })
      .join("\n")
  );
  const totalUnits = usable.reduce((a, s) => a + s.chapters.reduce((b, c) => b + c.units.length, 0), 0);
  console.log(`Secciones: ${usable.length} | Unidades totales: ${totalUnits}`);
}

build();
