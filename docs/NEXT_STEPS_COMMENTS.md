# Comments System - Next Steps (Action Plan)

## 🎯 What We've Completed (Phase 1)

✅ **Database Schema** - `docs/COMMENTS_MIGRATION.sql`
- 4 tables with indexes, RLS, triggers, views
- Ready to apply to Supabase

✅ **TypeScript Types** - `src/types/comments.ts`
- All interfaces and types defined
- Ready to import in components

✅ **React Query Hooks** - `src/hooks/useComments.ts`
- 16 hooks for all operations
- Ready to use in components

---

## 📋 Immediate Action Items

### TODAY: Apply Database Schema to Supabase

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Open your AfriTube project

2. **Run the Migration**
   - Go to SQL Editor
   - Click "New Query"
   - Copy entire contents of `docs/COMMENTS_MIGRATION.sql`
   - Paste into editor
   - Click "Run"
   - Wait for success

3. **Verify Tables**
   - Go to Table Editor
   - Verify these tables exist:
     - comments
     - comment_flags
     - comment_likes
     - comment_hearts

4. **Test RLS Policies**
   - Go to Authentication → Policies
   - Verify policies are in place for each table

---

## 🚀 Phase 2: Frontend Components (Days 3-7)

### Components to Build

1. **CommentForm.tsx** (8-10 hours)
   - Text input with character counter
   - Markdown support
   - Mention autocomplete
   - Emoji picker
   - GIF picker
   - Submit/cancel buttons

2. **CommentThread.tsx** (10-12 hours)
   - Display single comment
   - Show user info, timestamp, content
   - Show action buttons
   - Show pinned/hearted badges
   - Collapse/expand replies

3. **CommentList.tsx** (8-10 hours)
   - Display all comments
   - Sort dropdown
   - Pagination/infinite scroll
   - Pinned comments at top
   - Load more button

4. **CommentActions.tsx** (6-8 hours)
   - Reply button
   - Like button
   - Flag button
   - Edit button (if author)
   - Delete button (if author/creator)
   - Pin button (if creator)
   - Heart button (if creator)

5. **ModerationQueue.tsx** (8-10 hours)
   - List of flagged comments
   - Approve/reject buttons
   - Custom reason input
   - Filter by status
   - Pagination

---

## 📁 File Structure

```
src/
├── types/
│   └── comments.ts ✅ DONE
├── hooks/
│   └── useComments.ts ✅ DONE
├── components/
│   ├── CommentForm.tsx ⏳ TODO
│   ├── CommentThread.tsx ⏳ TODO
│   ├── CommentList.tsx ⏳ TODO
│   ├── CommentActions.tsx ⏳ TODO
│   └── ModerationQueue.tsx ⏳ TODO
└── pages/
    └── Watch.tsx (integrate CommentList)

docs/
├── COMMENTS_MIGRATION.sql ✅ DONE
├── COMMENTS_SYSTEM_IMPLEMENTATION_GUIDE.md ✅ DONE
├── COMMENTS_IMPLEMENTATION_STATUS.md ✅ DONE
└── NEXT_STEPS_COMMENTS.md ✅ THIS FILE
```

---

## 🔧 Integration Points

### In Watch.tsx (Video Page)
```typescript
import { CommentList } from '@/components/CommentList';

export default function Watch() {
  const { videoId } = useParams();
  
  return (
    <div>
      {/* Video player */}
      <VideoPlayer videoId={videoId} />
      
      {/* Comments section */}
      <CommentList videoId={videoId} />
    </div>
  );
}
```

### In Dashboard.tsx (Creator Dashboard)
```typescript
import { ModerationQueue } from '@/components/ModerationQueue';

export default function Dashboard() {
  return (
    <div>
      {/* Creator stats */}
      <CreatorStats />
      
      {/* Moderation queue */}
      <ModerationQueue />
    </div>
  );
}
```

---

## 📊 Timeline

```
TODAY (Day 1):
├─ Apply database migration to Supabase
├─ Verify tables and RLS policies
└─ Review spec documents

TOMORROW (Day 2):
├─ Create CommentForm component
├─ Create CommentThread component
└─ Create CommentList component

DAY 3 (Day 3):
├─ Create CommentActions component
├─ Create ModerationQueue component
└─ Integrate with Watch.tsx

DAY 4-5 (Days 4-5):
├─ Add React Query integration
├─ Add notification triggers
└─ Add loading/error states

DAY 6-7 (Days 6-7):
├─ Write unit tests
├─ Write integration tests
└─ Write E2E tests

DAY 8 (Day 8):
├─ Deploy to staging
├─ Run smoke tests
└─ Deploy to production
```

---

## ✅ Checklist

### Before Starting Phase 2
- [ ] Database migration applied to Supabase
- [ ] Tables verified in Supabase dashboard
- [ ] RLS policies verified
- [ ] Helper functions tested
- [ ] Spec documents reviewed with team

### Phase 2 Checklist
- [ ] CommentForm component created
- [ ] CommentThread component created
- [ ] CommentList component created
- [ ] CommentActions component created
- [ ] ModerationQueue component created
- [ ] All components integrated with React Query hooks
- [ ] Loading states added
- [ ] Error states added
- [ ] Mobile responsive design verified

### Phase 3 Checklist
- [ ] Unit tests written (80%+ coverage)
- [ ] Integration tests written
- [ ] E2E tests written
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Performance tested

### Phase 4 Checklist
- [ ] Deployed to staging
- [ ] Smoke tests passed
- [ ] Deployed to production
- [ ] Monitoring set up
- [ ] Documentation updated
- [ ] Team trained

---

## 🎓 Key Reminders

1. **Use React Query** - All data fetching through hooks
2. **Use TypeScript** - Full type safety
3. **Use Tailwind CSS** - Consistent styling
4. **Use Supabase RLS** - Security built-in
5. **Test on mobile** - Responsive design
6. **Add loading states** - Better UX
7. **Add error handling** - Graceful failures

---

## 📞 Questions?

See detailed spec documents:
- `.kiro/specs/comments-system/requirements.md` - Full requirements
- `.kiro/specs/comments-system/design.md` - Technical design
- `.kiro/specs/comments-system/tasks.md` - Implementation tasks

---

## 🚀 Ready to Start?

1. Apply the database migration to Supabase
2. Verify tables are created
3. Start building CommentForm component
4. Let me know when you're ready for Phase 2!

