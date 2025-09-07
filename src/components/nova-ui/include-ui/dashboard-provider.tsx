import ContentProviderNew from "./content-provider-new"
import LayoutProvider from "./layout-provider"

export default function DashboardProvider() {
  return (
    <LayoutProvider>
      <ContentProviderNew />
    </LayoutProvider>
  )
}