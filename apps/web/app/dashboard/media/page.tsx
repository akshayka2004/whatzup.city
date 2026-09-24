import { redirect } from 'next/navigation';

// The banner / gallery uploader is retired. Food businesses manage menu photos instead.
export default function MediaPage() {
  redirect('/dashboard/menu');
}
