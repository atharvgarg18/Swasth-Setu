import { SupabaseClient } from '@supabase/supabase-js';

export interface EmergencyAllocation {
  facility: {
    id: string;
    name: string;
    type: string;
    phone: string;
    address: string;
    distance_km: number;
  };
  ambulance: {
    number: string;
    eta_minutes: number;
    type: 'BLS' | 'ALS';
  };
  bed: {
    ward: string;
    bed_number: number;
  };
  doctor: {
    id: string;
    name: string;
    specialty: string;
    phone: string;
  };
}

export async function allocateEmergencyResources(
  patientId: string,
  symptoms: string[],
  patientDistrict: string,
  supabase: SupabaseClient
): Promise<EmergencyAllocation | null> {
  // 1. Query facilities in district
  const { data: facilities, error: facilityError } = await supabase
    .from('facilities')
    .select('id, name, type, phone, address, services, bed_capacity')
    .eq('district', patientDistrict)
    .eq('is_active', true);

  if (facilityError || !facilities || facilities.length === 0) {
    console.error('Failed to find facilities:', facilityError);
    return null;
  }

  // 2 & 3. Rank facilities based on type and matching services
  const typePriority: Record<string, number> = {
    district_hospital: 4,
    rural_hospital: 3,
    chc: 2,
    phc: 1,
    sub_centre: 0,
  };

  const isCardiac = symptoms.includes('chest_pain');
  const isTrauma = symptoms.includes('trauma') || symptoms.includes('bleeding');

  // Sort by priority (descending)
  facilities.sort((a, b) => {
    // If specific symptoms, check services first
    if (isCardiac) {
      const aHasCardio = a.services?.includes('Emergency') || a.services?.includes('Cardiology');
      const bHasCardio = b.services?.includes('Emergency') || b.services?.includes('Cardiology');
      if (aHasCardio && !bHasCardio) return -1;
      if (!aHasCardio && bHasCardio) return 1;
    }

    if (isTrauma) {
      const aHasTrauma = a.services?.includes('Trauma Center') || a.services?.includes('Emergency');
      const bHasTrauma = b.services?.includes('Trauma Center') || b.services?.includes('Emergency');
      if (aHasTrauma && !bHasTrauma) return -1;
      if (!aHasTrauma && bHasTrauma) return 1;
    }

    return (typePriority[b.type] || 0) - (typePriority[a.type] || 0);
  });

  const selectedFacility = facilities[0];

  // 4. Query doctors at the selected facility
  const { data: doctors } = await supabase
    .from('user_roles')
    .select('user_id, role, facility_id, profiles!inner(id, full_name, phone)')
    .eq('facility_id', selectedFacility.id)
    .eq('role', 'doctor')
    .eq('is_active', true)
    .limit(1);

  const selectedDoctor = doctors && doctors.length > 0 ? doctors[0] : null;

  // 5. Generate Ambulance Details
  const randomAmbulanceId = Math.floor(1000 + Math.random() * 9000);
  const isCritical = isCardiac || isTrauma || symptoms.includes('unconscious');
  const ambulanceType = isCritical ? 'ALS' : 'BLS';
  const eta = Math.floor(Math.random() * 16) + 10; // 10 to 25 mins
  const distance = Number((Math.random() * 15 + 2).toFixed(1)); // 2 to 17 km

  // 6. Allocate Bed
  const bedCount = selectedFacility.bed_capacity || 20;
  const bedNumber = Math.floor(Math.random() * bedCount) + 1;

  // 7. Auto-create records
  // 7a. emergency_cases
  const { data: emergencyCase, error: caseError } = await supabase
    .from('emergency_cases')
    .insert({
      patient_id: patientId,
      description: `Emergency case generated for symptoms: ${symptoms.join(', ')}`,
      severity: isCritical ? 'critical' : 'life_threatening',
      status: 'reported',
      target_facility_id: selectedFacility.id,
    })
    .select()
    .single();

  if (caseError) {
    console.error('Failed to create emergency case:', caseError);
  }

  // 7b. referrals
  if (emergencyCase) {
    await supabase.from('referrals').insert({
      patient_id: patientId,
      destination_facility_id: selectedFacility.id,
      urgency: 'emergency',
      reason: `Emergency Auto-Allocation: ${symptoms.join(', ')}`,
      status: 'created',
    });
  }

  // 7c. Notification (to facility admin or doctor)
  // Get facility admin
  const { data: admins } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('facility_id', selectedFacility.id)
    .eq('role', 'facility_admin')
    .eq('is_active', true);

  const notifications = [];
  if (admins && admins.length > 0) {
    notifications.push({
      user_id: admins[0].user_id,
      type: 'emergency_alert',
      title: 'Emergency Allocation',
      message: `New emergency case allocated to your facility. ETA: ${eta} mins.`,
    });
  }
  
  if (selectedDoctor && selectedDoctor.profiles) {
    notifications.push({
      user_id: selectedDoctor.user_id,
      type: 'emergency_alert',
      title: 'Emergency Patient Incoming',
      message: `Emergency patient inbound. ETA: ${eta} mins.`,
    });
  }

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications);
  }

  // 8. Return allocation
  return {
    facility: {
      id: selectedFacility.id,
      name: selectedFacility.name,
      type: selectedFacility.type,
      phone: selectedFacility.phone || 'N/A',
      address: selectedFacility.address || 'N/A',
      distance_km: distance,
    },
    ambulance: {
      number: `MH-12-AB-${randomAmbulanceId}`,
      eta_minutes: eta,
      type: ambulanceType,
    },
    bed: {
      ward: 'Emergency Ward',
      bed_number: bedNumber,
    },
    doctor: {
      id: (selectedDoctor as any)?.profiles?.id || 'doc-001',
      name: (selectedDoctor as any)?.profiles?.full_name || 'On-Call Emergency Doctor',
      specialty: 'Emergency Medicine',
      phone: (selectedDoctor as any)?.profiles?.phone || 'N/A',
    },
  };
}
