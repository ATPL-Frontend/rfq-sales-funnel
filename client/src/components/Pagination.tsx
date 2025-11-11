import { Button } from "./ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const handlePrev = () => {
    if (page > 1) onPageChange(page - 1);
  };

  const handleNext = () => {
    if (page < totalPages) onPageChange(page + 1);
  };

  const renderPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === page ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(i)}
        >
          {i}
        </Button>
      );
    }
    return pages;
  };

  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      <Button variant="outline" size="sm" onClick={handlePrev} disabled={page === 1}>
        Prev
      </Button>
      {renderPageNumbers()}
      <Button variant="outline" size="sm" onClick={handleNext} disabled={page === totalPages}>
        Next
      </Button>
    </div>
  );
}
