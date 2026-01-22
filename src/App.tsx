import Footer from './components/layout/Footer'
import Header from './components/layout/Header'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1"></main>
      <Footer />
    </div>
  )
}
