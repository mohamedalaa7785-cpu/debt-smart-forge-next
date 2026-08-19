# متطلبات النشر الاجتماعي الرسمية — 19 أغسطس 2026

## LinkedIn

توثيق LinkedIn الرسمي يوضح أن Posts API هو الواجهة الحالية لإنشاء واسترجاع المنشورات، وأن الواجهات تتطلب ترويسة `Linkedin-Version` بإصدار بصيغة `YYYYMM` وترويسة `X-Restli-Protocol-Version: 2.0.0`. نشر منشورات الأعضاء يحتاج `w_member_social`، بينما نشر منشورات المؤسسة يحتاج `w_organization_social` مع دور مناسب على صفحة المؤسسة. يجب عدم الاعتماد على Marketing Version 202508 لأنها موضحة كواجهة ستنتهي في 17 أغسطس 2026.

المصدر: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-07

## Instagram / Meta

توثيق Meta الرسمي المحدث في 30 يونيو 2026 يوضح أن Content Publishing يستهدف حسابات Instagram الاحترافية. يجب أن تكون الوسائط مستضافة على خادم عام وقت محاولة النشر، ثم تُنشأ حاوية عبر `/<IG_ID>/media` وتُنشر عبر `/<IG_ID>/media_publish`. يتطلب المسار صلاحيات وحسابات مختلفة بحسب استخدام Instagram Login أو Facebook Login، وقد يتطلب Page Publishing Authorization. يدعم المسار الصور والفيديوهات وReels والمنشورات متعددة الوسائط، مع ملاحظة أن Stories وReels لها قيود خاصة في بعض الحقول والتدفقات.

المصدر: https://developers.facebook.com/documentation/instagram-platform/content-publishing

## قرار التنفيذ

سيبدأ كل موصل بوضع تحقق ومعاينة، ثم يحتاج موافقة نشر مستقلة عن اعتماد المسودة. تُحفظ نتيجة الطلب ومعرف المنشور وحالة القناة ومعدل الاستخدام، مع زر إيقاف منفصل. لا تُخزن الرموز في المتصفح أو في قاعدة البيانات كنص مكشوف، ولا يُفعّل أي موصل قبل تزويد الحسابات والصلاحيات المطلوبة واختبار الحساب التجريبي.
