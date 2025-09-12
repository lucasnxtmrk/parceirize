declare module 'react-leaflet' {
  import { ComponentType, ReactNode, RefObject } from 'react'

  export interface MapContainerProps {
    center?: [number, number]
    zoom?: number
    scrollWheelZoom?: boolean
    className?: string
    children?: ReactNode
    ref?: RefObject<any>
  }

  export interface TileLayerProps {
    attribution?: string
    url?: string
  }

  export interface MarkerProps {
    position: [number, number]
    children?: ReactNode
  }

  export interface PopupProps {
    children?: ReactNode
  }

  export const MapContainer: ComponentType<MapContainerProps>
  export const TileLayer: ComponentType<TileLayerProps>
  export const Marker: ComponentType<MarkerProps>
  export const Popup: ComponentType<PopupProps>
}