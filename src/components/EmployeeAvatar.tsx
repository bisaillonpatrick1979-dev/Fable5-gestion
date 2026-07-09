import { useEffect, useState } from 'react';

interface EmployeeAvatarProps {
  src?: string;
  name: string;
  className: string;
  title?: string;
  key?: string | number;
}

// Certaines photos d'avatar (hébergées sur Unsplash) peuvent échouer à charger
// (connexion coupée, URL expirée, etc.). Dans ce cas on retombe sur un rond
// avec l'initiale du nom plutôt que l'icône d'image cassée du navigateur.
export default function EmployeeAvatar({ src, name, className, title }: EmployeeAvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    const initial = name.trim().charAt(0).toUpperCase() || '?';
    return (
      <div title={title} className={`${className} flex items-center justify-center bg-gray-700 text-white font-black select-none`}>
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      title={title}
      onError={() => setFailed(true)}
      className={className}
      referrerPolicy="no-referrer"
    />
  );
}
