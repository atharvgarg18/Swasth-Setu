'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Ambulance, Bed, User, Phone, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { EmergencyAllocation } from '@/lib/emergency/allocator';

interface EmergencyAllocationCardProps {
  allocation: EmergencyAllocation;
  patientName: string;
}

export function EmergencyAllocationCard({ allocation, patientName }: EmergencyAllocationCardProps) {
  const { t } = useI18n();

  return (
    <Card className="border-red-500 border-2 overflow-hidden animate-in fade-in zoom-in duration-300">
      <div className="bg-red-500 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 animate-pulse" />
          <h2 className="text-xl font-bold">{t('emergency.allocation.title', 'Emergency Resources Allocated')}</h2>
        </div>
        <Badge variant="outline" className="bg-white/20 text-white border-white/40">
          {patientName}
        </Badge>
      </div>

      <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-red-50/30">
        
        {/* Hospital Section */}
        <div className="space-y-3 p-4 bg-white rounded-lg shadow-sm border border-red-100">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <Building2 className="h-5 w-5" />
            <h3 className="font-semibold text-lg">{t('emergency.facility', 'Target Facility')}</h3>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-gray-900">{allocation.facility.name}</p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Badge variant="secondary">{allocation.facility.type.replace('_', ' ').toUpperCase()}</Badge>
              <span>â€¢</span>
              <span className="flex items-center"><MapPin className="h-3 w-3 mr-1"/> {allocation.facility.distance_km} km</span>
            </div>
            <p className="text-sm text-gray-600 truncate mt-2">{allocation.facility.address}</p>
          </div>
        </div>

        {/* Ambulance Section */}
        <div className="space-y-3 p-4 bg-white rounded-lg shadow-sm border border-red-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-red-500">
            <Ambulance className="h-24 w-24" />
          </div>
          <div className="flex items-center gap-2 text-red-700 mb-2 relative z-10">
            <Ambulance className="h-5 w-5" />
            <h3 className="font-semibold text-lg">{t('emergency.ambulance', 'Dispatched Ambulance')}</h3>
          </div>
          <div className="space-y-2 relative z-10">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xl tracking-wider text-gray-800">{allocation.ambulance.number}</span>
              <Badge className={allocation.ambulance.type === 'ALS' ? 'bg-red-600' : 'bg-orange-500'}>
                {allocation.ambulance.type}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-red-600 font-medium mt-2 bg-red-50 p-2 rounded inline-flex">
              <Clock className="h-4 w-4" />
              <span>ETA: {allocation.ambulance.eta_minutes} {t('common.minutes', 'mins')}</span>
            </div>
          </div>
        </div>

        {/* Bed Section */}
        <div className="space-y-3 p-4 bg-white rounded-lg shadow-sm border border-red-100">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <Bed className="h-5 w-5" />
            <h3 className="font-semibold text-lg">{t('emergency.bed', 'Reserved Bed')}</h3>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-gray-900">{allocation.bed.ward}</p>
            <p className="text-2xl font-light text-gray-600">
              {t('emergency.bed_number', 'Bed')} <span className="font-bold text-gray-900">#{allocation.bed.bed_number}</span>
            </p>
          </div>
        </div>

        {/* Doctor Section */}
        <div className="space-y-3 p-4 bg-white rounded-lg shadow-sm border border-red-100">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <User className="h-5 w-5" />
            <h3 className="font-semibold text-lg">{t('emergency.doctor', 'Assigned Doctor')}</h3>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-gray-900">{allocation.doctor.name}</p>
            <p className="text-sm text-gray-500">{allocation.doctor.specialty}</p>
            <div className="flex items-center gap-2 mt-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium">{allocation.doctor.phone}</span>
            </div>
          </div>
        </div>

      </CardContent>

      <div className="bg-gray-50 p-4 flex gap-4 justify-end border-t border-gray-100">
        <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
          <a href={`tel:${allocation.facility.phone}`}>
            <Phone className="mr-2 h-4 w-4" />
            {t('emergency.action.call_hospital', 'Call Hospital')}
          </a>
        </Button>
        <Button className="bg-red-600 hover:bg-red-700 text-white animate-pulse">
          <a href="tel:108">
            <Phone className="mr-2 h-4 w-4" />
            {t('emergency.action.call_108', 'Call 108 (Ambulance)')}
          </a>
        </Button>
      </div>
    </Card>
  );
}
