import moment from "moment";

export const html = (strings, ...values) => String.raw(strings, ...values.map(o => Array.isArray(o) ? o.join('') : o));

export const date = (date, format) => moment(date).format(format)