import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="space-y-4 flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold">404 - Not found</h1>
      <p className="text-muted-foreground">
        The page you requested does not exist.
      </p>
      <Link
        to="/app/rfq"
        className="hover:text-teal-800 hover:underline text-primary"
      >
        Go home
      </Link>
    </div>
  );
}
