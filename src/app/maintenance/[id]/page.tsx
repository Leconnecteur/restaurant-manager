import MaintenanceDetailClient from './MaintenanceDetailClient';

// Next.js App Router type pour les params de page dynamique
type Props = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

// Composant serveur pour la page de détail de maintenance
export default async function MaintenancePage({ params }: Props) {
  // Renvoyer le composant client avec l'ID
  return <MaintenanceDetailClient id={params.id} />;
}
