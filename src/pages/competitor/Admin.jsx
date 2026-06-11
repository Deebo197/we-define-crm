import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Hotel, Users, Link2 } from 'lucide-react';
import HotelsAdmin from '@/components/competitor/HotelsAdmin';
import CompSetsAdmin from '@/components/competitor/CompSetsAdmin';
import OperatorsAdmin from '@/components/competitor/OperatorsAdmin';
import RoomMappingsAdmin from '@/components/competitor/RoomMappingsAdmin';

export default function CompetitorAdmin() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Admin</h1>
        <p className="text-sm text-muted mt-1">Manage hotels, comp sets, operators & rooms</p>
      </div>

      <Tabs defaultValue="hotels">
        <TabsList className="bg-surface border border-line mb-6">
          <TabsTrigger value="hotels" className="text-xs gap-1.5">
            <Hotel className="h-3.5 w-3.5" /> Hotels
          </TabsTrigger>
          <TabsTrigger value="compsets" className="text-xs gap-1.5">
            <Link2 className="h-3.5 w-3.5" /> Comp Sets
          </TabsTrigger>
          <TabsTrigger value="operators" className="text-xs gap-1.5">
            <Users className="h-3.5 w-3.5" /> Operators
          </TabsTrigger>
          <TabsTrigger value="rooms" className="text-xs gap-1.5">
            <Hotel className="h-3.5 w-3.5" /> Room Mappings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hotels"><HotelsAdmin /></TabsContent>
        <TabsContent value="compsets"><CompSetsAdmin /></TabsContent>
        <TabsContent value="operators"><OperatorsAdmin /></TabsContent>
        <TabsContent value="rooms"><RoomMappingsAdmin /></TabsContent>
      </Tabs>
    </div>
  );
}
