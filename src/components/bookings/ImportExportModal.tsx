'use client';

import React, { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ImportSummary {
  sheet?: string;
  totalRows: number;
  importable: number;
  created: number;
  updated: number;
  unchanged: number;
  newRooms: { campus?: string; room: string }[];
  skipped: { reason: string; label: string; count: number }[];
  issues: { row: number; reason: string; detail: string }[];
  dayMismatches: number;
  overlaps: { count: number; examples: { rows: [number, number]; room: string; campus: string; courses: string; start: string }[] };
  committed: boolean;
}

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
  campusId?: string;
  roomId?: string;
}

export function ImportExportModal({ isOpen, onClose, onImported, campusId, roomId }: ImportExportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [busy, setBusy] = useState<'preview' | 'commit' | null>(null);

  const reset = () => {
    setFile(null);
    setSummary(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const close = () => {
    reset();
    onClose();
  };

  const send = async (mode: 'preview' | 'commit', f: File) => {
    setBusy(mode);
    try {
      const form = new FormData();
      form.append('file', f);
      form.append('mode', mode);
      const res = await fetch('/api/bookings/import', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setSummary(data);
      if (mode === 'commit') {
        toast.success(`Imported: ${data.created} new, ${data.updated} updated`);
        onImported();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const exportUrl = (format: 'csv' | 'xlsx') => {
    const params = new URLSearchParams({ format });
    if (campusId) params.set('campusId', campusId);
    if (roomId) params.set('roomId', roomId);
    return `/api/bookings/export?${params.toString()}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title="Import / Export schedule" size="xl">
      <div className="mt-2 space-y-6">
        <section>
          <h4 className="text-sm font-semibold text-slate-900">Export</h4>
          <p className="mt-1 text-sm text-slate-500">
            Downloads bookings{campusId ? ' for the selected campus' + (roomId ? ' and room' : '') : ''} in the same
            columns as the import file.
          </p>
          <div className="mt-3 flex gap-3">
            <a href={exportUrl('xlsx')}>
              <Button type="button" variant="secondary">
                <ArrowDownTrayIcon className="h-4 w-4" /> Excel (.xlsx)
              </Button>
            </a>
            <a href={exportUrl('csv')}>
              <Button type="button" variant="secondary">
                <ArrowDownTrayIcon className="h-4 w-4" /> CSV
              </Button>
            </a>
          </div>
        </section>

        <section className="border-t border-slate-100 pt-5">
          <h4 className="text-sm font-semibold text-slate-900">Import</h4>
          <p className="mt-1 text-sm text-slate-500">
            CSV or Excel with columns <code className="text-xs">SessionDate, CampusID, TermID, CourseID, SectionID,
            CourseName, SessionID, TimeSlots, RoomID</code>. Online / Virtual rows are skipped. Re-uploading updates
            existing sessions instead of duplicating them.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="block text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
                setSummary(null);
                if (f) send('preview', f);
              }}
            />
            {busy === 'preview' && <span className="text-sm text-slate-500">Checking file…</span>}
          </div>

          {summary && (
            <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p>
                <strong>{summary.totalRows}</strong> rows read{summary.sheet ? ` from sheet "${summary.sheet}"` : ''}.{' '}
                <strong>{summary.importable}</strong> in-person sessions:{' '}
                {summary.committed ? (
                  <>
                    <strong>{summary.created}</strong> created, <strong>{summary.updated}</strong> updated,{' '}
                    {summary.unchanged} unchanged.
                  </>
                ) : (
                  <>
                    <strong>{summary.created}</strong> new, <strong>{summary.updated}</strong> already in the portal (will be
                    updated if changed).
                  </>
                )}
              </p>
              {summary.skipped.length > 0 && (
                <div>
                  <p className="font-medium">Skipped</p>
                  <ul className="ml-5 list-disc">
                    {summary.skipped.map((s) => (
                      <li key={s.reason}>
                        {s.label}: {s.count}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.newRooms.length > 0 && (
                <p>
                  {summary.committed ? 'Rooms created' : 'New rooms to be created'} ({summary.newRooms.length}):{' '}
                  {summary.newRooms.map((r) => `${r.room} (${r.campus})`).join(', ')}
                </p>
              )}
              {(summary.overlaps.count > 0 || summary.dayMismatches > 0) && (
                <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-amber-800">
                  <ExclamationTriangleIcon className="h-5 w-5 flex-none" />
                  <div className="space-y-1">
                    {summary.overlaps.count > 0 && (
                      <p>
                        {summary.overlaps.count} session(s) overlap another session in the same room (imported anyway).
                        {summary.overlaps.examples.slice(0, 3).map((o) => (
                          <span key={o.rows.join('-')} className="block text-xs">
                            Rows {o.rows[0]} &amp; {o.rows[1]}: {o.courses} in {o.room}, {o.campus}
                          </span>
                        ))}
                      </p>
                    )}
                    {summary.dayMismatches > 0 && (
                      <p>
                        {summary.dayMismatches} session(s) fall on a day not listed in TimeSlots; the first time range was
                        used.
                      </p>
                    )}
                  </div>
                </div>
              )}
              {summary.issues.length > 0 && (
                <details>
                  <summary className="cursor-pointer font-medium">Row problems ({summary.issues.length})</summary>
                  <ul className="mt-1 max-h-40 overflow-y-auto text-xs">
                    {summary.issues.map((i) => (
                      <li key={`${i.row}-${i.reason}`}>
                        Row {i.row}: {i.reason} – {i.detail}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={close}>
          {summary?.committed ? 'Done' : 'Cancel'}
        </Button>
        {!summary?.committed && (
          <Button
            onClick={() => file && send('commit', file)}
            disabled={!file || !summary || summary.importable === 0}
            loading={busy === 'commit'}
          >
            <ArrowUpTrayIcon className="h-4 w-4" /> Import {summary ? summary.importable : ''} sessions
          </Button>
        )}
      </div>
    </Modal>
  );
}
