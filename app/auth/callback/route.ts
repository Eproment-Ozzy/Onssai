import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// E-posta onay linki buraya doner; oturum cerezleri burada yazilir
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/login?error=link`)
}
