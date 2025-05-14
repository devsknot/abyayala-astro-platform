globalThis.process ??= {}; globalThis.process.env ??= {};
function formatDate(date) {
  if (!date) return "";
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      return "";
    }
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric"
    };
    const formattedDate = dateObj.toLocaleDateString("es-ES", options);
    return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  } catch (error) {
    console.error("Error al formatear la fecha:", error);
    return "";
  }
}
function formatShortDate(date) {
  if (!date) return "";
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      return "";
    }
    const shortMonths = [
      "ene",
      "feb",
      "mar",
      "abr",
      "may",
      "jun",
      "jul",
      "ago",
      "sep",
      "oct",
      "nov",
      "dic"
    ];
    const day = dateObj.getDate();
    const month = shortMonths[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (error) {
    console.error("Error al formatear la fecha corta:", error);
    return "";
  }
}
function formatRelativeDate(date) {
  if (!date) return "";
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      return "";
    }
    const now = /* @__PURE__ */ new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInSecs = Math.floor(diffInMs / 1e3);
    const diffInMins = Math.floor(diffInSecs / 60);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);
    if (diffInSecs < 60) {
      return "hace un momento";
    } else if (diffInMins < 60) {
      return `hace ${diffInMins} ${diffInMins === 1 ? "minuto" : "minutos"}`;
    } else if (diffInHours < 24) {
      return `hace ${diffInHours} ${diffInHours === 1 ? "hora" : "horas"}`;
    } else if (diffInDays < 7) {
      return `hace ${diffInDays} ${diffInDays === 1 ? "día" : "días"}`;
    } else if (diffInWeeks < 4) {
      return `hace ${diffInWeeks} ${diffInWeeks === 1 ? "semana" : "semanas"}`;
    } else if (diffInMonths < 12) {
      return `hace ${diffInMonths} ${diffInMonths === 1 ? "mes" : "meses"}`;
    } else {
      return `hace ${diffInYears} ${diffInYears === 1 ? "año" : "años"}`;
    }
  } catch (error) {
    console.error("Error al formatear la fecha relativa:", error);
    return "";
  }
}

export { formatRelativeDate as a, formatShortDate as b, formatDate as f };
