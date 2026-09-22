type LogoJiraProps = { tamanho?: number };

/** Marca do Jira, desenhada em SVG aqui dentro.
 *
 *  Vai inline e não como arquivo de imagem por dois motivos práticos: não
 *  depende de rede nem de CDN para aparecer, e acompanha o tamanho do texto sem
 *  ficar borrada em tela retina. */
export function LogoJira({ tamanho = 28 }: LogoJiraProps) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Jira"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="jira-a" x1="16" y1="8.2" x2="10.3" y2="13.9">
          <stop offset="0.18" stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
        <linearGradient id="jira-b" x1="16.1" y1="23.7" x2="21.8" y2="18.1">
          <stop offset="0.18" stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
      </defs>
      <path
        fill="#2684FF"
        d="M30.7 15.3 17.2 1.8 15.9.5 5.7 10.7 1 15.3a1.1 1.1 0 0 0 0 1.5l9.4 9.4 5.5 5.5 10.2-10.2.2-.2 4.4-4.5a1.1 1.1 0 0 0 0-1.5ZM15.9 20.8 11.2 16l4.7-4.7 4.7 4.7Z"
      />
      <path fill="url(#jira-a)" d="M15.9 11.3A7.9 7.9 0 0 1 15.9.2L5.7 10.4l5.5 5.5Z" />
      <path fill="url(#jira-b)" d="m20.6 15.9-4.7 4.7a7.9 7.9 0 0 1 0 11.2l10.2-10.2Z" />
    </svg>
  );
}
