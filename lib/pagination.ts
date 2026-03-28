export function getPagination(req: Request) {
  const { searchParams } = new URL(req.url);

  const page = Math.max(1, Number(searchParams.get("page") || 1));

  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit") || 20))
  );

  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
  };
}
