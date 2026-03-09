import { useState } from 'react';
import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Download,
  Calculator,
  User,
  Building,
  Euro
} from 'lucide-react';

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export default function QuotesPage() {
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const [projectType, setProjectType] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [validityDays, setValidityDays] = useState('30');
  const [items, setItems] = useState<QuoteItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }
  ]);

  const addItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tva = subtotal * 0.2; // 20% TVA
  const total = subtotal + tva;

  const generateQuote = () => {
    // TODO: Implement PDF generation or API call
    console.log('Generating quote...', { clientInfo, projectType, projectDescription, items, total });
  };

  return (
    <PageWrapper>
        <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Générateur de Devis
              </h1>
              <p className="text-sm text-white/70">Créez des devis professionnels en quelques clics</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" data-testid="button-preview">
                <FileText className="h-4 w-4 mr-2" />
                Aperçu
              </Button>
              <Button size="sm" onClick={generateQuote} data-testid="button-generate">
                <Download className="h-4 w-4 mr-2" />
                Générer PDF
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6">
          {/* Client Information */}
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white hover-elevate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-white" />
                Informations Client
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-name" className="text-white">Nom complet</Label>
                <Input
                  id="client-name"
                  data-testid="input-client-name"
                  value={clientInfo.name}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom du client"
                  className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-email" className="text-white">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  data-testid="input-client-email"
                  value={clientInfo.email}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemple.com"
                  className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone" className="text-white">Téléphone</Label>
                <Input
                  id="client-phone"
                  data-testid="input-client-phone"
                  value={clientInfo.phone}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="06 12 34 56 78"
                  className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-address" className="text-white">Adresse</Label>
                <Input
                  id="client-address"
                  data-testid="input-client-address"
                  value={clientInfo.address}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Adresse complète"
                  className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Project Information */}
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white hover-elevate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-white" />
                Détails du Projet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project-type" className="text-white">Type de projet</Label>
                  <Select value={projectType} onValueChange={setProjectType}>
                    <SelectTrigger data-testid="select-project-type" className="bg-black/20 backdrop-blur-md border-white/10 text-white">
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                      <SelectItem value="piscine">Piscine & Spa</SelectItem>
                      <SelectItem value="paysage">Aménagement Paysager</SelectItem>
                      <SelectItem value="menuiserie">Menuiserie Sur-Mesure</SelectItem>
                      <SelectItem value="renovation">Rénovation</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validity" className="text-white">Validité du devis (jours)</Label>
                  <Input
                    id="validity"
                    type="number"
                    data-testid="input-validity"
                    value={validityDays}
                    onChange={(e) => setValidityDays(e.target.value)}
                    placeholder="30"
                    className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-description" className="text-white">Description du projet</Label>
                  <Textarea
                    id="project-description"
                    data-testid="textarea-project-description"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Décrivez en détail le projet à réaliser..."
                    rows={3}
                    className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                  />
              </div>
            </CardContent>
          </Card>

          {/* Quote Items */}
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-green-500" />
                Détail du Devis
              </CardTitle>
              <Button size="sm" onClick={addItem} data-testid="button-add-item">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter ligne
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg">
                  <div className="md:col-span-5 space-y-2">
                    <Label className="text-white">Description</Label>
                    <Input
                      data-testid={`input-item-description-${index}`}
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Description de la prestation"
                      className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Quantité</Label>
                    <Input
                      type="number"
                      data-testid={`input-item-quantity-${index}`}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.1"
                      className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Prix unitaire</Label>
                    <Input
                      type="number"
                      data-testid={`input-item-price-${index}`}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Total</Label>
                    <div className="h-9 px-3 py-2 bg-black/20 backdrop-blur-md border border-white/10 rounded-md flex items-center text-sm font-medium text-white">
                      {item.total.toFixed(2)} €
                    </div>
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        data-testid={`button-remove-item-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <Separator />

              {/* Totals */}
              <div className="space-y-2 bg-black/20 backdrop-blur-md border border-white/10 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/70">Sous-total HT</span>
                  <span className="font-medium text-white">{subtotal.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/70">TVA (20%)</span>
                  <span className="font-medium text-white">{tva.toFixed(2)} €</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-white">Total TTC</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-black/20 backdrop-blur-md border border-white/10 text-white">
                      <Euro className="h-3 w-3 mr-1" />
                      {total.toFixed(2)} €
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
    </PageWrapper>
  );
}