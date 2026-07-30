"use client";

import { useMemo, useState } from "react";
import { Grid, type CellComponentProps } from "react-window";
import type { IconSearchEntry } from "../../../types/icon";
import IconCard from "./IconCard";

const CARD_SIZE = 132;

interface CellProps {
  entries: IconSearchEntry[];
  columnCount: number;
  onSelect: (entry: IconSearchEntry) => void;
}

function Cell({
  columnIndex,
  rowIndex,
  style,
  entries,
  columnCount,
  onSelect,
}: CellComponentProps<CellProps>) {
  const index = rowIndex * columnCount + columnIndex;
  const entry = entries[index];
  if (!entry) return <div style={style} />;
  return (
    <div style={style}>
      <IconCard entry={entry} onSelect={onSelect} />
    </div>
  );
}

export default function IconGrid({
  entries,
  onSelect,
}: {
  entries: IconSearchEntry[];
  onSelect: (entry: IconSearchEntry) => void;
}) {
  const [size, setSize] = useState({ width: 800, height: 600 });

  const columnCount = Math.max(1, Math.floor(size.width / CARD_SIZE));
  const rowCount = Math.ceil(entries.length / columnCount);

  const cellProps = useMemo(
    () => ({ entries, columnCount, onSelect }),
    [entries, columnCount, onSelect],
  );

  return (
    <div className="h-full w-full bg-[var(--background)]">
      <Grid
        cellComponent={Cell}
        cellProps={cellProps}
        columnCount={columnCount}
        columnWidth={size.width / columnCount}
        rowCount={rowCount}
        rowHeight={CARD_SIZE}
        onResize={setSize}
        overscanCount={4}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
