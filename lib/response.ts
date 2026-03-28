export function success(data: any) {
  return { success: true, data };
}

export function fail(error: string) {
  return { success: false, error };
}
