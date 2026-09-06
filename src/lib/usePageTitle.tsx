// useTitle pour changer le titre de la page dans l'onglet du navigateur
// Du Style Titre de la page | Nom de l'application


import { useEffect } from "react";

export default function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | Quiz Mada`;
  }, [title]);
}