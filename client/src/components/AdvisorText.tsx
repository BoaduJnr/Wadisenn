import type { ReactNode } from "react";

/**
 * Renders the small subset of Markdown the advisor actually produces: bold
 * runs, bullet and numbered lists, and short headings.
 *
 * Deliberately hand-rolled rather than pulling in a Markdown dependency, and
 * it builds React elements instead of setting innerHTML — so model output can
 * never inject markup, whatever it returns.
 */

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // **bold** and *italic* / _italic_, left to right.
  const pattern = /\*\*([^*]+)\*\*|(?<![\w*])[*_]([^*_\n]+)[*_](?![\w*])/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    if (match[1] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b${i}`} style={{ color: "var(--text-primary)" }}>
          {match[1]}
        </strong>,
      );
    } else {
      nodes.push(<em key={`${keyPrefix}-i${i}`}>{match[2]}</em>);
    }
    cursor = match.index + match[0].length;
    i++;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

type Block =
  | { kind: "heading"; text: string }
  | { kind: "para"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] };

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length > 0) {
      blocks.push({ kind: "para", text: para.join(" ") });
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ kind: "list", ...list });
      list = null;
    }
  };

  for (const raw of source.split("\n")) {
    const trimmed = raw.trim();

    if (trimmed === "") {
      flushPara();
      flushList();
      continue;
    }

    const heading = /^#{1,6}\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushPara();
      flushList();
      blocks.push({ kind: "heading", text: heading[1] });
      continue;
    }

    const bullet = /^[-*•]\s+(.*)$/.exec(trimmed);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (bullet || numbered) {
      flushPara();
      const ordered = Boolean(numbered);
      const item = (bullet ?? numbered)![1];
      // A change of list type starts a new list rather than mixing markers.
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(item);
      continue;
    }

    flushList();
    para.push(trimmed);
  }

  flushPara();
  flushList();
  return blocks;
}

export function AdvisorText({ text }: { text: string }) {
  const blocks = parse(text);

  return (
    <div className="flex flex-col gap-2.5 text-sm leading-relaxed">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <h4
              key={index}
              className="font-display text-sm font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {inline(block.text, `h${index}`)}
            </h4>
          );
        }

        if (block.kind === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              key={index}
              className={`flex flex-col gap-1.5 pl-1 ${block.ordered ? "" : ""}`}
            >
              {block.items.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span
                    className="shrink-0 font-semibold tabular-nums"
                    style={{ color: "var(--brand)" }}
                    aria-hidden
                  >
                    {block.ordered ? `${i + 1}.` : "•"}
                  </span>
                  <span>{inline(item, `l${index}-${i}`)}</span>
                </li>
              ))}
            </ListTag>
          );
        }

        return <p key={index}>{inline(block.text, `p${index}`)}</p>;
      })}
    </div>
  );
}
