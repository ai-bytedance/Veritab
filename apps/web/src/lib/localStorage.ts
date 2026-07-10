export function getStoredData<T>(key: string, initialValue: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : initialValue;
  } catch {
    return initialValue;
  }
}

export function setStoredData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to store data for ${key}:`, error);
  }
}
