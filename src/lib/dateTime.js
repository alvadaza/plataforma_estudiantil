const PLATFORM_TIME_ZONE = "America/Bogota";
const PLATFORM_UTC_OFFSET = "-05:00";

const parsePlatformDate = (value) => {
  if (!value) return null;

  const dateValue = String(value).trim().replace(" ", "T");
  const hasTimeZone = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(dateValue);
  const normalizedValue = hasTimeZone
    ? dateValue
    : `${dateValue.length === 10 ? `${dateValue}T00:00:00` : dateValue}${PLATFORM_UTC_OFFSET}`;
  const date = new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const platformDateTimeLocalToDatabaseValue = (value) => {
  if (!value) return null;
  const date = parsePlatformDate(`${value}:00${PLATFORM_UTC_OFFSET}`);
  if (!date) throw new Error("La fecha límite ingresada no es válida.");
  return `${value}:00${PLATFORM_UTC_OFFSET}`;
};

export const platformDateToDateTimeLocal = (value) => {
  const date = parsePlatformDate(value);
  if (!date) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PLATFORM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
};

export const parsePlatformDateTime = parsePlatformDate;

export const formatPlatformDateTime = (value) => {
  const date = parsePlatformDate(value);
  return date
    ? new Intl.DateTimeFormat("es-CO", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: PLATFORM_TIME_ZONE,
      }).format(date)
    : "";
};

export const formatPlatformDate = (value) => {
  const date = parsePlatformDate(value);
  return date
    ? new Intl.DateTimeFormat("es-CO", {
        dateStyle: "short",
        timeZone: PLATFORM_TIME_ZONE,
      }).format(date)
    : "";
};
