import MaintenanceDetailClient from './MaintenanceDetailClient';

type PageProps = {
  params: {
    id: string;
  };
};

// Composant serveur pour la page de détail de maintenance
export default function MaintenancePage({ params }: PageProps) {
  return <MaintenanceDetailClient id={params.id} />;
}
