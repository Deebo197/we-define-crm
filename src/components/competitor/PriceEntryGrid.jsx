import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AlertTriangle, Check, Pencil } from 'lucide-react';
import { TONES } from '@/lib/statusColors';

export default function PriceEntryGrid({
  hotels,
  compSets,
  clientHotelIds,
  roomMappings,
  travelDate,
  entries,
  onUpdateEntry,
}) {
  const clientHotels = hotels.filter(h => clientHotelIds.includes(h.id));

  const getCompSetForClient = (clientId) => {
    const compIds = compSets
      .filter(cs => cs.client_hotel_id === clientId)
      .map(cs => cs.competitor_hotel_id);
    return hotels.filter(h => compIds.includes(h.id));
  };

  const getDefaultRoom = (hotelId) => {
    const mapping = roomMappings.find(rm => rm.hotel_id === hotelId);
    return mapping?.default_room || '';
  };

  const getEntry = (hotelId) => {
    return entries.find(e => e.hotel_id === hotelId && e.travel_date === travelDate) || {};
  };

  const renderHotelRow = (hotel, isClient) => {
    const entry = getEntry(hotel.id);
    const defaultRoom = getDefaultRoom(hotel.id);
    const hasRoomOverride = entry.actual_room && entry.actual_room !== defaultRoom;

    return (
      <div
        key={hotel.id}
        className={cn(
          "grid grid-cols-12 gap-2 items-center p-3 rounded-xl transition-colors",
          isClient ? "bg-primary-soft/50 border border-primary/15" : "hover:bg-black/[0.02]"
        )}
      >
        <div className="col-span-3 flex items-center gap-2 min-w-0">
          <span className={cn("text-sm font-medium truncate", isClient ? "text-primary" : "text-ink")}>
            {hotel.name}
          </span>
          {isClient && (
            <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-semibold flex-shrink-0", TONES.primary.pill)}>
              Client
            </span>
          )}
          {isClient && hotel.client_name && (
            <span className="text-[10px] text-faint truncate hidden xl:inline">· {hotel.client_name}</span>
          )}
        </div>
        <div className="col-span-2 text-xs text-muted truncate">
          {defaultRoom}
        </div>
        <div className="col-span-2 relative">
          <Input
            placeholder="Room override"
            value={entry.actual_room || ''}
            onChange={(e) => onUpdateEntry(hotel.id, travelDate, { actual_room: e.target.value })}
            className="h-8 text-xs"
          />
          {hasRoomOverride && (
            <Pencil className="absolute right-2 top-2 h-3 w-3 text-warning" />
          )}
        </div>
        <div className="col-span-2">
          <div className="relative">
            <span className="absolute left-2 top-1.5 text-xs text-faint">£</span>
            <Input
              type="number"
              placeholder="0"
              value={entry.price || ''}
              onChange={(e) => onUpdateEntry(hotel.id, travelDate, { price: parseFloat(e.target.value) || null })}
              className="h-8 text-xs pl-5"
            />
          </div>
        </div>
        <div className="col-span-2">
          <Input
            placeholder="Notes"
            value={entry.notes || ''}
            onChange={(e) => onUpdateEntry(hotel.id, travelDate, { notes: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
        <div className="col-span-1 flex justify-center">
          {entry.price ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-warning opacity-60" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-3 text-[10px] font-medium uppercase tracking-wider text-faint">
        <div className="col-span-3">Hotel</div>
        <div className="col-span-2">Default Room</div>
        <div className="col-span-2">Room Override</div>
        <div className="col-span-2">Price (£pp)</div>
        <div className="col-span-2">Notes</div>
        <div className="col-span-1 text-center">Status</div>
      </div>

      {/* Client Hotels */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-2 px-3">Client Hotels</p>
        <div className="space-y-1">
          {clientHotels.map(h => renderHotelRow(h, true))}
        </div>
      </div>

      {/* Comp Sets */}
      {clientHotels.map(client => {
        const comps = getCompSetForClient(client.id);
        if (comps.length === 0) return null;
        return (
          <div key={client.id}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-faint mb-2 px-3">
              {client.name} Comp Set
            </p>
            <div className="space-y-1">
              {comps.map(h => renderHotelRow(h, false))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
