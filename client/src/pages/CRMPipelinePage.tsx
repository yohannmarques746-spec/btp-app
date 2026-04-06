import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Workflow } from 'lucide-react';
import { CRMPipeline } from '@/components/CRMPipeline';

export default function CRMPipelinePage() {
  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4 rounded-tl-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold md:text-2xl text-white">
              CRM Pipeline
            </h1>
            <p className="text-sm text-white/70">Gérez vos prospects et automatisez vos workflows</p>
          </div>
          <Button className="h-11 min-w-[44px] px-4 text-sm touch-manipulation bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30">
            <Mail className="h-4 w-4 mr-2" />
            Connecter Email
          </Button>
        </div>
      </header>

      <main className="flex-1 px-3 py-3 md:px-6 md:py-6 space-y-6">
        {/* Configuration Email */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-white/70" />
              Configuration Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-white/70 mb-4">
              Connectez votre email professionnel pour activer les automatisations et recevoir les prospects directement dans votre pipeline.
            </p>
            <Button variant="outline" className="h-11 min-w-[44px] px-4 text-sm touch-manipulation w-full text-white border-white/20 hover:bg-white/10">
              <Mail className="h-4 w-4 mr-2" />
              Connecter Gmail / Outlook
            </Button>
          </CardContent>
        </Card>

        {/* CRM Pipeline */}
        <CRMPipeline />
      </main>
    </PageWrapper>
  );
}

