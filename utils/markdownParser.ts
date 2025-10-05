export const parseSimpleMarkdown = (text: string): string => {
  if (!text) return '';

  let html = text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold: **text** or __text__
    .replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>')
    // Italic: *text* or _text_
    .replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>')
    // Strikethrough: ~~text~~
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    // Inline code: `code`
    .replace(/`(.*?)`/g, '<code class="bg-bg-tertiary text-text-primary px-1 py-0.5 rounded text-xs">$1</code>');

  // Unordered lists
  html = html.replace(/^\s*[-*+]\s+(.*)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\n<ul>/g, '');

  // Ordered lists
  html = html.replace(/^\s*\d+\.\s+(.*)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, (match, p1) => {
    // A bit of a hack to differentiate from ULs. If the first li's content doesn't start with a number, it was probably a UL.
    if (match.startsWith('<li>') && !/^\s*\d/.test(text.slice(text.indexOf(p1)))) {
        return `<ul>${p1}</ul>`;
    }
    return `<ol>${p1}</ol>`;
  });
  html = html.replace(/<\/ol>\n<ol>/g, '');
  
  // Replace newlines with <br> tags, but not inside list items
  html = html.replace(/\n/g, '<br />');
  html = html.replace(/<li(.*?)><br \/>/g, '<li$1>');
  html = html.replace(/<br \/>\n*<(ul|ol)>/g, '<$1>');
  html = html.replace(/<\/(ul|ol)><br \/>/g, '</$1>');


  return html;
};