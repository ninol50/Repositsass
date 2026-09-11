/**
 * Tiny Markdown renderer for the subset the prompt engine emits.
 *
 * HTML is escaped before any transform runs, so generated content can never
 * inject markup. A full Markdown library would be 40kB for features we do not
 * produce.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(text: string): string {
  let out = escapeHtml(text);

  // Code spans are pulled out first so bold markers inside them are left alone.
  const codes: string[] = [];
  out = out.replace(/`([^`]+)`/g, (_m, c: string) => {
    codes.push(c);
    return `@@CODE${codes.length - 1}@@`;
  });

  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  out = out.replace(/@@CODE(\d+)@@/g, (_m, i: string) => `<code>${codes[Number(i)]}</code>`);
  return out;
}

function renderTable(rows: string[]): string {
  const cells = (line: string) =>
    line
      .replace(/^\s*\|/, "")
      .replace(/\|\s*$/, "")
      .split("|")
      .map((c) => c.trim());

  const header = cells(rows[0]);
  const bodyRows = rows.slice(2).map(cells);

  const thead = `<thead><tr>${header.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${bodyRows
    .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;
  return `<table>${thead}${tbody}</table>`;
}

const BLOCK_START = /^(#{1,4}\s|```|>|\s*[-*]\s|\s*\d+\.\s|\s*\||---+\s*$)/;

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // Table
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+$/.test(lines[i + 1])) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      out.push(renderTable(buf));
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
      continue;
    }

    // Checkbox list
    if (/^\s*-\s\[[ x]\]\s/i.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*-\s\[[ x]\]\s/i.test(lines[i])) {
        const checked = /\[x\]/i.test(lines[i]);
        const text = lines[i].replace(/^\s*-\s\[[ x]\]\s/i, "");
        const mark = checked ? "&#10003;" : "&#9675;";
        const color = checked ? "#4fe3c1" : "#6b6b82";
        buf.push(
          `<li class="task-item"><span style="color:${color}">${mark}</span>${inline(text)}</li>`,
        );
        i++;
      }
      out.push(`<ul class="task-list">${buf.join("")}</ul>`);
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        buf.push(`<li>${inline(lines[i].replace(/^\s*[-*]\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul>${buf.join("")}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        buf.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ol>${buf.join("")}</ol>`);
      continue;
    }

    // Headings
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = Math.min(heading[1].length, 4);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      out.push("<hr />");
      i++;
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !BLOCK_START.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    if (buf.length > 0) out.push(`<p>${inline(buf.join(" "))}</p>`);
    else i++;
  }

  return out.join("\n");
}
