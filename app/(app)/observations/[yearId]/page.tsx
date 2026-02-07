'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import jsPDF from 'jspdf';
import { OBSERVATION_STATUS_LABELS } from '@/lib/statusLabels';

interface ObservationYear {
  id: string;
  year: number;
  status: 'open' | 'closed';
}

interface Observation {
  id: string;
  date: string;
  location: string;
  class_level: string;
  number_of_horses: number;
  status: 'pending' | 'approved' | 'rejected';
  host_name: string;
}

export default function ObservationYearPage() {
  const router = useRouter();
  const { yearId } = useParams();

  const [year, setYear] = useState<ObservationYear | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: yearData, error: yearError } = await supabase
        .from('observation_year')
        .select('*')
        .eq('id', yearId)
        .single();

      if (yearError || !yearData) {
        setError('Observation year not found');
        setLoading(false);
        return;
      }

      const { data: obsData, error: obsError } = await supabase
        .from('observations')
        .select('id, date, location, class_level, number_of_horses, status, host_name')
        .eq('observation_year_id', yearId)
        .order('date', { ascending: false });

      if (obsError) {
        setError('Could not load observations');
      } else {
        setObservations(obsData ?? []);
      }

      setYear(yearData);
      setLoading(false);
    };

    load();
  }, [yearId]);

  if (loading) return <p className="p-6">Loading…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!year) return null;

  const isLocked = year.status === 'closed';

  const handleDownloadPdf = () => {
    if (!year) return;

    const doc = new jsPDF();
    let yPos = 15;

    doc.setFontSize(16);
    doc.text(`Bisittingsskjema ${year.year}`, 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.text('Navn på dommer: ___________________________', 14, yPos);
    yPos += 8;

    doc.text('Dato generert: ' + new Date().toLocaleDateString('no-NO'), 14, yPos);
    yPos += 10;

    observations.forEach((obs, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(11);
      doc.text(`Bisitting ${index + 1}`, 14, yPos);
      yPos += 6;

      doc.setFontSize(10);
      doc.text(`Dato: ${obs.date}`, 18, yPos);
      yPos += 5;
      doc.text(`Sted: ${obs.location}`, 18, yPos);
      yPos += 5;
      doc.text(`Klasse: ${obs.class_level}`, 18, yPos);
      yPos += 5;
      doc.text(`Antall ekvipasjer: ${obs.number_of_horses}`, 18, yPos);
      yPos += 8;
      doc.text(`Dommer bisittet: ${obs.host_name}`, 18, yPos);
      yPos += 5;
    });

    doc.save(`bisittingsskjema_${year.year}.pdf`);
  };

  const handleOpenObservation = (id: string) => {
    router.push(`/observations/edit/${id}`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <section className="card">
        {/* 🔹 Header */}
        <div className="mb-6">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-semibold">Bisitting – {year.year}</h1>

            {!isLocked && (
              <button
                onClick={() => router.push(`/observations/${year.id}/new`)}
                className="btn btn-primary w-full md:w-auto"
              >
                + Registrer ny bisitting
              </button>
            )}
          </div>
        </div>

        {observations.length === 0 ? (
          <div className="text-gray-500 border rounded p-6">No observations yet.</div>
        ) : (
          <div className="space-y-3">
            {/* 📱 Mobil: kort */}
            <div className="md:hidden space-y-3">
              {observations.map((obs) => {
                const isApproved = obs.status === 'approved';

                return (
                  <div key={obs.id} className="border rounded-lg bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-gray-500">{obs.date}</div>
                        <div className="text-lg font-semibold">{obs.location}</div>
                        <div className="text-sm text-gray-600">{obs.class_level}</div>
                      </div>

                      <div className="text-sm font-medium">
                        {OBSERVATION_STATUS_LABELS[obs.status]}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-500">Antall</div>
                      <div className="font-medium">{obs.number_of_horses}</div>

                      <div className="text-gray-500">Dommer</div>
                      <div className="font-medium">{obs.host_name}</div>
                    </div>

                    <div className="mt-4">
                      <button
                        onClick={() => handleOpenObservation(obs.id)}
                        disabled={isApproved}
                        className={`btn btn-secondary w-full ${
                          isApproved ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        Rediger
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 🖥 Desktop: tabell */}
            <div className="hidden md:block border rounded overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">Dato</th>
                      <th className="text-left p-3">Sted</th>
                      <th className="text-left p-3">Klasse</th>
                      <th className="text-left p-3">Antall ekvipasjer</th>
                      <th className="text-left p-3">Dommer</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Handling</th>
                    </tr>
                  </thead>
                  <tbody>
                    {observations.map((obs) => {
                      const isApproved = obs.status === 'approved';

                      return (
                        <tr key={obs.id} className="border-t">
                          <td className="p-3">{obs.date}</td>
                          <td className="p-3">{obs.location}</td>
                          <td className="p-3">{obs.class_level}</td>
                          <td className="p-3">{obs.number_of_horses}</td>
                          <td className="p-3">{obs.host_name}</td>
                          <td className="p-3">{OBSERVATION_STATUS_LABELS[obs.status]}</td>
                          <td className="p-3">
                            <button
                              onClick={() => handleOpenObservation(obs.id)}
                              disabled={isApproved}
                              className={`btn btn-secondary btn-sm ${
                                isApproved ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              Rediger
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {observations.length > 0 && (
          <div className="mt-6">
            <button onClick={handleDownloadPdf} className="btn btn-primary">
              Last ned bisittingsskjema (PDF)
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
