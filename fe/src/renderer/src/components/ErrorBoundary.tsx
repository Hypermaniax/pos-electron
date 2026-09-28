import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@renderer/components/ui/card'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Kesalahan antarmuka:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex min-h-full items-center justify-center bg-muted/40 p-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Terjadi kesalahan antarmuka</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{this.state.error.message}</p>
            </CardContent>
            <CardFooter>
              <Button type="button" onClick={() => this.setState({ error: null })}>
                Coba lagi
              </Button>
            </CardFooter>
          </Card>
        </div>
      )
    }
    return this.props.children
  }
}
