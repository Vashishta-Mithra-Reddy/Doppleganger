import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { ArrowRight, Users, Sparkles, Globe } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Find Your Doppelgänger!
                </h1>
                <div style={{ marginTop: '2rem' }}>
                </div>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Connect with people who share your passions, interests, and quirks. Your perfect match is just a click away.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/sign-in">
                <Button>
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-black dark:opacity-85 rounded-md">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-3 text-center">
                <Users className="h-10 w-10 text-primary" />
                <h2 className="text-xl font-bold">Match Algorithm</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 px-16">
                  Get matched with people who have similar interests, possibly your Doppelgänger!
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3 text-center">
                <Globe className="h-10 w-10 text-primary" />
                <h2 className="text-xl font-bold">Global Community</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 px-16">
                  Connect with like-minded individuals from all around the world.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3 text-center">
                <Sparkles className="h-10 w-10 text-primary" />
                <h2 className="text-xl font-bold">New Experiences</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 px-16">
                  Discover and participate in events tailored to your shared interests.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
