# Prompt جاهز لـ Copilot + Supabase

انسخ البرومبت التالي داخل Copilot (وعدّل اسم المشروع فقط):

```text
أنت مهندس Full-Stack Senior. أريدك تعمل Audit كامل لقاعدة بيانات Supabase في مشروعي وتصلح أي أخطاء Schema أو RLS أو جداول ناقصة بدون تكسير البيانات الحالية.

المطلوب بالتفصيل:
1) افحص الجداول الحالية وقارنها بالمطلوب التالي:
   - profiles
   - users
   - clients
   - client_phones
   - client_addresses
   - client_loans
   - client_actions
2) أنشئ SQL migration idempotent (يشتغل بأمان أكثر من مرة) باستخدام:
   - CREATE TABLE IF NOT EXISTS
   - ALTER TABLE ... ADD COLUMN IF NOT EXISTS
   - CREATE INDEX IF NOT EXISTS
   - DROP POLICY IF EXISTS + CREATE POLICY
3) أصلح العلاقات الأساسية:
   - clients.owner_id -> users.id
   - client_phones.client_id -> clients.id ON DELETE CASCADE
   - client_addresses.client_id -> clients.id ON DELETE CASCADE
   - client_loans.client_id -> clients.id ON DELETE CASCADE
4) تأكد من الأعمدة الأساسية في clients:
   - name, email, company, branch, notes, referral
   - portfolio_type, domain_type
   - owner_id, created_by, created_at, updated_at
5) فعل RLS للجداول:
   - profiles, clients, client_phones, client_addresses, client_loans
6) سياسات RLS:
   - admin/hidden_admin يقدروا يشوفوا ويعدلوا كل شيء
   - collector يشوف ويعدل العملاء اللي owner_id = auth.uid() أو created_by = auth.uid()
7) أضف indexes للأداء:
   - clients(name), clients(email), clients(owner_id), clients(created_at)
   - child tables على client_id
8) أنشئ function مساعدة للتحقق من admin من جدول profiles (is_admin_user).
9) أعطني SQL النهائي في ملف واحد منظم + checklist اختبار بعد التنفيذ.

وأخيراً: لا تحذف بيانات حالية. اعمل تغييرات incremental وآمنة فقط.
```

## تأكيد الصفحة داخل الموقع
- صفحة إضافة العميل موجودة على المسار: `/add-client`.
- ويجب أن تكون موجودة في Dashboard Sidebar باسم: `Add Client`.
