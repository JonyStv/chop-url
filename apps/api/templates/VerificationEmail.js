import { createElement as h } from 'react';
import {
  Html, Head, Preview, Body, Container,
  Section, Text, Button, Hr, Img,
} from 'react-email';

export function VerificationEmail({ username, verifyUrl }) {
  return h(Html, null,
    h(Head),
    h(Preview, null, 'Verifica tu cuenta para empezar'),
    h(Body, { style: main },
      h(Container, { style: container },
        h(Img, {
          src: 'https://stvdev.com/logo.png',
          width: 120,
          alt: 'Logo',
        }),
        h(Text, { style: heading }, `¡Hola ${username}!`),
        h(Text, { style: paragraph },
          'Gracias por registrarte. Confirma tu correo haciendo clic aquí:'
        ),
        h(Section, { style: { textAlign: 'center', margin: '32px 0' } },
          h(Button, { href: verifyUrl, style: button }, 'Verificar mi cuenta')
        ),
        h(Text, { style: small },
          'O copia este enlace:',
          h('br'),
          ' ',
          verifyUrl
        ),
        h(Hr),
        h(Text, { style: footer },
          'Este enlace expira en 24 horas. Si no creaste esta cuenta, ignora este correo.'
        )
      )
    )
  );
}

const main = { backgroundColor: '#f6f9fc', fontFamily: 'Arial, sans-serif' };
const container = { backgroundColor: '#fff', padding: '32px', borderRadius: '8px', maxWidth: '600px', margin: '0 auto' };
const heading = { fontSize: '22px', fontWeight: 'bold', color: '#111' };
const paragraph = { fontSize: '15px', color: '#444', lineHeight: '1.6' };
const button = { backgroundColor: '#000', color: '#fff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none' };
const small = { fontSize: '12px', color: '#666', wordBreak: 'break-all' };
const footer = { fontSize: '12px', color: '#999' };