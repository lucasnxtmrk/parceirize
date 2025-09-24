export const MENU_ITEMS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'ri:dashboard-3-line',
    url: '/dashboard'
  },
  {
    key: 'clientes',
    label: 'Gestão de Clientes',
    icon: 'ri:group-line',
    url: '/admin-cliente'
  },
  {
    key: 'parceiros',
    label: 'Gestão de Parceiros',
    icon: 'ri:building-line',
    url: '/admin-parceiro'
  },
  {
    key: 'relatorios',
    label: 'Relatórios',
    icon: 'ri:bar-chart-line',
    url: '/admin-relatorios'
  },
  {
    key: 'integracoes',
    label: 'Integrações',
    icon: 'ri:links-line',
    children: [
      {
        key: 'integracoes-config',
        label: 'Configurações SGP',
        url: '/integracoes'
      },
      {
        key: 'importacoes-status',
        label: 'Status das Importações',
        url: '/dashboard/importacoes'
      }
    ]
  },
  {
    key: 'configuracoes',
    label: 'Configurações',
    icon: 'ri:settings-line',
    url: '/admin-configuracoes'
  },
];
