import * as React from "react";

type ColumnAlign = "left" | "center" | "right";

export interface Column<T> {
  key: keyof T | string;
  label: string | React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  align?: ColumnAlign;
}

interface CommonTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
}

const getAlignClass = (align: ColumnAlign = "left") => {
  switch (align) {
    case "center":
      return "text-center";
    case "right":
      return "text-right";
    default:
      return "text-left";
  }
};

export default function CommonTable<T>({
  columns,
  data,
  loading,
  hasMore,
  onLoadMore,
  className,
}: CommonTableProps<T>) {
  const loaderRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!hasMore || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { rootMargin: "100px" },
    );

    const current = loaderRef.current;
    if (current) observer.observe(current);

    return () => {
      if (current) observer.unobserve(current);
    };
  }, [hasMore, onLoadMore]);

  return (
    <div
      className={`border rounded-lg overflow-x-auto w-full ${className ?? ""}`}
    >
      {/* Table for medium+ screens */}
      <table className="hidden md:table min-w-full border-collapse text-sm">
        <thead className="bg-secondary/90">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`p-3 font-medium align-top ${getAlignClass(col.align)}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row: any, idx) => (
            <tr
              key={idx}
              className={`border-t hover:bg-muted/30 align-top ${
                idx % 2 === 0 ? "bg-gray-100" : "bg-muted/20"
              }`}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={`p-2 align-middle ${getAlignClass(col.align)}`}
                >
                  {col.render ? col.render(row, idx) : (row as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}

          {loading && (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center p-2 text-muted-foreground"
              >
                Loading...
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Mobile-friendly stacked cards */}
      <div className="md:hidden divide-y divide-border">
        {data.map((row: any, idx) => (
          <div key={idx} className={`p-4 flex flex-col gap-2`}>
            {columns.map((col) => (
              <div
                key={String(col.key)}
                className="flex justify-between text-sm "
              >
                <span className="font-medium text-muted-foreground">
                  {col.label}
                </span>
                <span
                  className={`wrap-break-word ${getAlignClass(col.align)} ${
                    col.align === "right" ? "ml-auto" : ""
                  }`}
                >
                  {col.render ? col.render(row, idx) : (row as any)[col.key]}
                </span>
              </div>
            ))}
          </div>
        ))}

        {loading && (
          <div className="p-4 text-center text-muted-foreground">
            Loading...
          </div>
        )}
      </div>

      {/* Intersection observer trigger */}
      {hasMore && <div ref={loaderRef} className="h-6" />}
    </div>
  );
}
