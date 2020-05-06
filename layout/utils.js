const dateFormatter = new Intl.DateTimeFormat('en-US', {
  //year: 'numeric', month: 'long', day: 'numeric'
  dateStyle: 'long'
});

export const html = (strings, ...values) => String.raw(strings, ...values.map(o => Array.isArray(o) ? o.join('') : o));

export const formatDate = date => dateFormatter.format(Date.parse(date));