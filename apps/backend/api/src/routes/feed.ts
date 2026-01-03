import express, { Request, Response } from 'express';
import { db } from '../core/db';
import { tenantMiddleware, rbacMiddleware, requirePermission } from '../middleware/tenant';
import { handleApiError } from '../core/error-utils';
import { z } from 'zod';
import { eq, and, or, desc, asc, sql, isNull, inArray, lt, gt } from 'drizzle-orm';
import {
  feedPosts,
  feedPostRecipients,
  feedReactions,
  feedComments,
  feedPostReads,
  feedUserFavorites,
  feedUserUnfollows,
  feedPollOptions,
  feedPollVotes,
  feedPollSettings,
  userBadges,
  users,
  teams,
  userTeams,
  insertFeedPostSchema,
  insertFeedCommentSchema,
  type FeedPost,
  type FeedComment,
  type FeedPollOption,
} from '../db/schema/w3suite';

const router = express.Router();

router.use(tenantMiddleware);
router.use(rbacMiddleware);

const createPostBodySchema = z.object({
  postType: z.enum(['message', 'announcement', 'poll', 'appreciation']),
  title: z.string().max(500).optional(),
  content: z.string().min(1),
  attachments: z.array(z.any()).default([]),
  mentionedUserIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  teamId: z.string().uuid().optional().nullable(),
  department: z.string().optional().nullable(),
  isHighlighted: z.boolean().default(false),
  expiresAt: z.string().datetime().optional().nullable(),
  badgeType: z.enum([
    'star_performer', 'team_player', 'innovation', 'customer_hero',
    'mentor', 'problem_solver', 'dedication', 'leadership', 'collaboration', 'creativity'
  ]).optional().nullable(),
  awardeeUserIds: z.array(z.string()).default([]),
  recipients: z.object({
    isAllUsers: z.boolean().default(true),
    userIds: z.array(z.string()).default([]),
    teamIds: z.array(z.string()).default([]),
    departments: z.array(z.string()).default([])
  }).default({ isAllUsers: true, userIds: [], teamIds: [], departments: [] }),
  pollOptions: z.array(z.string()).optional(),
  pollSettings: z.object({
    visibilityMode: z.enum(['public', 'anonymous', 'user_defined']).default('public'),
    allowMultipleChoices: z.boolean().default(false),
    allowVoteChange: z.boolean().default(true)
  }).optional()
});

const createCommentBodySchema = z.object({
  content: z.string().min(1),
  mentionedUserIds: z.array(z.string()).default([]),
  parentCommentId: z.string().uuid().optional().nullable()
});

const addReactionBodySchema = z.object({
  reactionType: z.string().min(1).max(50)
});

const voteBodySchema = z.object({
  optionIds: z.array(z.string().uuid()),
  isAnonymous: z.boolean().default(false)
});

const feedQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  postType: z.enum(['message', 'announcement', 'poll', 'appreciation']).optional(),
  authorId: z.string().optional(),
  department: z.string().optional(),
  teamId: z.string().uuid().optional(),
  pinnedOnly: z.coerce.boolean().optional(),
  favoritesOnly: z.coerce.boolean().optional(),
  unreadOnly: z.coerce.boolean().optional()
});

async function enrichPostWithDetails(post: FeedPost, userId: string, tenantId: string) {
  const [
    authorData,
    commentsData,
    reactionsData,
    userReactionData,
    isFavorited,
    isRead,
    isUnfollowed
  ] = await Promise.all([
    db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.profileImageUrl
    }).from(users).where(eq(users.id, post.authorId)).limit(1),
    
    db.select().from(feedComments)
      .where(eq(feedComments.postId, post.id))
      .orderBy(asc(feedComments.createdAt))
      .limit(3),
    
    db.select({
      reactionType: feedReactions.reactionType,
      count: sql<number>`count(*)::int`
    }).from(feedReactions)
      .where(eq(feedReactions.postId, post.id))
      .groupBy(feedReactions.reactionType),
    
    db.select().from(feedReactions)
      .where(and(
        eq(feedReactions.postId, post.id),
        eq(feedReactions.userId, userId)
      )),
    
    db.select().from(feedUserFavorites)
      .where(and(
        eq(feedUserFavorites.postId, post.id),
        eq(feedUserFavorites.userId, userId)
      )).limit(1),
    
    db.select().from(feedPostReads)
      .where(and(
        eq(feedPostReads.postId, post.id),
        eq(feedPostReads.userId, userId)
      )).limit(1),
    
    db.select().from(feedUserUnfollows)
      .where(and(
        eq(feedUserUnfollows.postId, post.id),
        eq(feedUserUnfollows.userId, userId)
      )).limit(1)
  ]);

  let pollData = null;
  if (post.postType === 'poll') {
    const [options, settings, userVotes] = await Promise.all([
      db.select().from(feedPollOptions)
        .where(eq(feedPollOptions.postId, post.id))
        .orderBy(asc(feedPollOptions.sortOrder)),
      
      db.select().from(feedPollSettings)
        .where(eq(feedPollSettings.postId, post.id))
        .limit(1),
      
      db.select().from(feedPollVotes)
        .where(and(
          eq(feedPollVotes.postId, post.id),
          eq(feedPollVotes.userId, userId)
        ))
    ]);

    const totalVotes = options.reduce((sum, opt) => sum + (opt.voteCount || 0), 0);
    
    pollData = {
      options: options.map(opt => ({
        ...opt,
        percentage: totalVotes > 0 ? Math.round((opt.voteCount || 0) / totalVotes * 100) : 0,
        isSelected: userVotes.some(v => v.optionId === opt.id)
      })),
      settings: settings[0] || { visibilityMode: 'public', allowMultipleChoices: false, allowVoteChange: true },
      totalVotes,
      hasVoted: userVotes.length > 0
    };
  }

  let badgeAwardees: any[] = [];
  if (post.postType === 'appreciation' && post.awardeeUserIds && post.awardeeUserIds.length > 0) {
    badgeAwardees = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.profileImageUrl
    }).from(users).where(inArray(users.id, post.awardeeUserIds));
  }

  return {
    ...post,
    author: authorData[0] || null,
    recentComments: commentsData,
    reactions: reactionsData.reduce((acc, r) => ({ ...acc, [r.reactionType]: r.count }), {}),
    userReactions: userReactionData.map(r => r.reactionType),
    isFavorited: isFavorited.length > 0,
    isRead: isRead.length > 0,
    isUnfollowed: isUnfollowed.length > 0,
    poll: pollData,
    badgeAwardees
  };
}

router.get('/posts', requirePermission('communication.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    const query = feedQuerySchema.parse(req.query);
    
    // Step 1: Get posts that the user can see based on recipient scoping
    // A post is visible to a user if:
    // - The user is the author, OR
    // - The post has isAllUsers = true in recipients, OR
    // - The user is explicitly in the recipients, OR
    // - The user's team is in the recipients, OR
    // - The user's department is in the recipients
    
    // First, get the user's teams and department
    const userTeamData = await db.select({ teamId: userTeams.teamId })
      .from(userTeams)
      .where(eq(userTeams.userId, userId));
    const userTeamIds = userTeamData.map(ut => ut.teamId);
    
    // Get all post IDs the user can access via recipients
    const visiblePostsFromRecipients = await db.selectDistinct({ postId: feedPostRecipients.postId })
      .from(feedPostRecipients)
      .where(or(
        eq(feedPostRecipients.isAllUsers, true),
        eq(feedPostRecipients.userId, userId),
        ...(userTeamIds.length > 0 ? [inArray(feedPostRecipients.teamId, userTeamIds)] : [])
      ));
    
    const visiblePostIds = visiblePostsFromRecipients.map(v => v.postId);
    
    // Build base conditions
    let conditions: any[] = [
      eq(feedPosts.tenantId, tenantId),
      eq(feedPosts.isActive, true),
      // User can see posts where they are the author OR the post is in their visible set
      or(
        eq(feedPosts.authorId, userId),
        ...(visiblePostIds.length > 0 ? [inArray(feedPosts.id, visiblePostIds)] : [sql`FALSE`])
      )
    ];
    
    if (query.postType) {
      conditions.push(eq(feedPosts.postType, query.postType));
    }
    if (query.authorId) {
      conditions.push(eq(feedPosts.authorId, query.authorId));
    }
    if (query.teamId) {
      conditions.push(eq(feedPosts.teamId, query.teamId));
    }
    if (query.pinnedOnly) {
      conditions.push(eq(feedPosts.isPinned, true));
    }
    if (query.cursor) {
      conditions.push(lt(feedPosts.createdAt, new Date(query.cursor)));
    }
    
    // Handle favorites filter BEFORE building the query
    if (query.favoritesOnly) {
      const favoritePostIds = await db.select({ postId: feedUserFavorites.postId })
        .from(feedUserFavorites)
        .where(eq(feedUserFavorites.userId, userId));
      
      if (favoritePostIds.length === 0) {
        return res.json({ posts: [], hasMore: false, nextCursor: null });
      }
      conditions.push(inArray(feedPosts.id, favoritePostIds.map(f => f.postId)));
    }
    
    // Now build and execute the query with all conditions
    const posts = await db.select().from(feedPosts)
      .where(and(...conditions))
      .orderBy(desc(feedPosts.isPinned), desc(feedPosts.createdAt))
      .limit(query.limit + 1);
    
    const hasMore = posts.length > query.limit;
    const postsToReturn = posts.slice(0, query.limit);
    
    const enrichedPosts = await Promise.all(
      postsToReturn.map(post => enrichPostWithDetails(post, userId, tenantId))
    );
    
    res.json({
      posts: enrichedPosts,
      hasMore,
      nextCursor: hasMore && postsToReturn.length > 0 
        ? postsToReturn[postsToReturn.length - 1].createdAt.toISOString() 
        : null
    });
  } catch (error) {
    handleApiError(error, res);
  }
});

router.get('/posts/:postId', requirePermission('communication.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const { postId } = req.params;
    
    const [post] = await db.select().from(feedPosts)
      .where(and(
        eq(feedPosts.id, postId),
        eq(feedPosts.tenantId, tenantId),
        eq(feedPosts.isActive, true)
      ));
    
    if (!post) {
      return res.status(404).json({ error: 'Post non trovato' });
    }
    
    await db.insert(feedPostReads)
      .values({ postId, userId })
      .onConflictDoNothing();
    
    await db.update(feedPosts)
      .set({ viewsCount: sql`${feedPosts.viewsCount} + 1` })
      .where(eq(feedPosts.id, postId));
    
    const enrichedPost = await enrichPostWithDetails(post, userId, tenantId);
    
    res.json(enrichedPost);
  } catch (error) {
    handleApiError(error, res);
  }
});

router.post('/posts', requirePermission('communication.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    const body = createPostBodySchema.parse(req.body);
    
    const [newPost] = await db.insert(feedPosts).values({
      tenantId,
      authorId: userId,
      postType: body.postType,
      title: body.title,
      content: body.content,
      attachments: body.attachments,
      mentionedUserIds: body.mentionedUserIds,
      tags: body.tags,
      teamId: body.teamId,
      department: body.department as any,
      isHighlighted: body.isHighlighted,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      badgeType: body.badgeType as any,
      awardeeUserIds: body.awardeeUserIds
    }).returning();
    
    if (body.recipients.isAllUsers) {
      await db.insert(feedPostRecipients).values({
        postId: newPost.id,
        isAllUsers: true
      });
    } else {
      const recipientValues: any[] = [];
      
      body.recipients.userIds.forEach(userId => {
        recipientValues.push({ postId: newPost.id, userId });
      });
      body.recipients.teamIds.forEach(teamId => {
        recipientValues.push({ postId: newPost.id, teamId });
      });
      body.recipients.departments.forEach(department => {
        recipientValues.push({ postId: newPost.id, department });
      });
      
      if (recipientValues.length > 0) {
        await db.insert(feedPostRecipients).values(recipientValues);
      }
    }
    
    if (body.postType === 'poll' && body.pollOptions && body.pollOptions.length > 0) {
      const pollOptionValues = body.pollOptions.map((text, index) => ({
        postId: newPost.id,
        optionText: text,
        sortOrder: index
      }));
      
      await db.insert(feedPollOptions).values(pollOptionValues);
      
      if (body.pollSettings) {
        await db.insert(feedPollSettings).values({
          postId: newPost.id,
          visibilityMode: body.pollSettings.visibilityMode,
          allowMultipleChoices: body.pollSettings.allowMultipleChoices,
          allowVoteChange: body.pollSettings.allowVoteChange
        });
      }
    }
    
    if (body.postType === 'appreciation' && body.awardeeUserIds.length > 0) {
      const badgeValues = body.awardeeUserIds.map(awardeeId => ({
        tenantId,
        userId: awardeeId,
        badgeType: body.badgeType!,
        postId: newPost.id,
        awardedByUserId: userId
      }));
      
      await db.insert(userBadges).values(badgeValues);
    }
    
    const enrichedPost = await enrichPostWithDetails(newPost, userId, tenantId);
    
    res.status(201).json(enrichedPost);
  } catch (error) {
    handleApiError(error, res);
  }
});

router.patch('/posts/:postId', requirePermission('communication.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const { postId } = req.params;
    
    const [post] = await db.select().from(feedPosts)
      .where(and(
        eq(feedPosts.id, postId),
        eq(feedPosts.tenantId, tenantId)
      ));
    
    if (!post) {
      return res.status(404).json({ error: 'Post non trovato' });
    }
    
    if (post.authorId !== userId) {
      return res.status(403).json({ error: 'Non autorizzato a modificare questo post' });
    }
    
    const updateData = z.object({
      title: z.string().max(500).optional(),
      content: z.string().min(1).optional(),
      isHighlighted: z.boolean().optional(),
      expiresAt: z.string().datetime().optional().nullable(),
      isPinned: z.boolean().optional()
    }).parse(req.body);
    
    const [updatedPost] = await db.update(feedPosts)
      .set({
        ...updateData,
        expiresAt: updateData.expiresAt ? new Date(updateData.expiresAt) : undefined,
        updatedAt: new Date()
      })
      .where(eq(feedPosts.id, postId))
      .returning();
    
    const enrichedPost = await enrichPostWithDetails(updatedPost, userId, tenantId);
    
    res.json(enrichedPost);
  } catch (error) {
    handleApiError(error, res);
  }
});

router.delete('/posts/:postId', requirePermission('communication.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const { postId } = req.params;
    
    const [post] = await db.select().from(feedPosts)
      .where(and(
        eq(feedPosts.id, postId),
        eq(feedPosts.tenantId, tenantId)
      ));
    
    if (!post) {
      return res.status(404).json({ error: 'Post non trovato' });
    }
    
    if (post.authorId !== userId) {
      return res.status(403).json({ error: 'Non autorizzato a eliminare questo post' });
    }
    
    await db.update(feedPosts)
      .set({ isActive: false })
      .where(eq(feedPosts.id, postId));
    
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res);
  }
});

router.post('/posts/:postId/reactions', requirePermission('communication.write'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { postId } = req.params;
    
    const { reactionType } = addReactionBodySchema.parse(req.body);
    
    const existing = await db.select().from(feedReactions)
      .where(and(
        eq(feedReactions.postId, postId),
        eq(feedReactions.userId, userId),
        eq(feedReactions.reactionType, reactionType)
      )).limit(1);
    
    if (existing.length > 0) {
      await db.delete(feedReactions)
        .where(and(
          eq(feedReactions.postId, postId),
          eq(feedReactions.userId, userId),
          eq(feedReactions.reactionType, reactionType)
        ));
      
      await db.update(feedPosts)
        .set({ reactionsCount: sql`GREATEST(${feedPosts.reactionsCount} - 1, 0)` })
        .where(eq(feedPosts.id, postId));
      
      res.json({ action: 'removed', reactionType });
    } else {
      await db.insert(feedReactions).values({
        postId,
        userId,
        reactionType
      });
      
      await db.update(feedPosts)
        .set({ reactionsCount: sql`${feedPosts.reactionsCount} + 1` })
        .where(eq(feedPosts.id, postId));
      
      res.json({ action: 'added', reactionType });
    }
  } catch (error) {
    handleApiError(error, res);
  }
});

router.get('/posts/:postId/comments', requirePermission('communication.read'), async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    
    const comments = await db.select({
      comment: feedComments,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.profileImageUrl
      }
    })
    .from(feedComments)
    .leftJoin(users, eq(feedComments.userId, users.id))
    .where(eq(feedComments.postId, postId))
    .orderBy(asc(feedComments.createdAt));
    
    const formattedComments = comments.map(c => ({
      ...c.comment,
      user: c.user
    }));
    
    res.json(formattedComments);
  } catch (error) {
    handleApiError(error, res);
  }
});

router.post('/posts/:postId/comments', requirePermission('communication.write'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { postId } = req.params;
    
    const body = createCommentBodySchema.parse(req.body);
    
    const [newComment] = await db.insert(feedComments).values({
      postId,
      userId,
      content: body.content,
      mentionedUserIds: body.mentionedUserIds,
      parentCommentId: body.parentCommentId
    }).returning();
    
    await db.update(feedPosts)
      .set({ commentsCount: sql`${feedPosts.commentsCount} + 1` })
      .where(eq(feedPosts.id, postId));
    
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.profileImageUrl
    }).from(users).where(eq(users.id, userId));
    
    res.status(201).json({
      ...newComment,
      user
    });
  } catch (error) {
    handleApiError(error, res);
  }
});

router.delete('/posts/:postId/comments/:commentId', requirePermission('communication.write'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { postId, commentId } = req.params;
    
    const [comment] = await db.select().from(feedComments)
      .where(and(
        eq(feedComments.id, commentId),
        eq(feedComments.postId, postId)
      ));
    
    if (!comment) {
      return res.status(404).json({ error: 'Commento non trovato' });
    }
    
    if (comment.userId !== userId) {
      return res.status(403).json({ error: 'Non autorizzato a eliminare questo commento' });
    }
    
    await db.delete(feedComments).where(eq(feedComments.id, commentId));
    
    await db.update(feedPosts)
      .set({ commentsCount: sql`GREATEST(${feedPosts.commentsCount} - 1, 0)` })
      .where(eq(feedPosts.id, postId));
    
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res);
  }
});

router.post('/posts/:postId/vote', requirePermission('communication.write'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { postId } = req.params;
    
    const { optionIds, isAnonymous } = voteBodySchema.parse(req.body);
    
    const [settings] = await db.select().from(feedPollSettings)
      .where(eq(feedPollSettings.postId, postId));
    
    if (settings?.isClosed) {
      return res.status(400).json({ error: 'Sondaggio chiuso' });
    }
    
    if (!settings?.allowMultipleChoices && optionIds.length > 1) {
      return res.status(400).json({ error: 'Scelta singola consentita' });
    }
    
    const existingVotes = await db.select().from(feedPollVotes)
      .where(and(
        eq(feedPollVotes.postId, postId),
        eq(feedPollVotes.userId, userId)
      ));
    
    if (existingVotes.length > 0 && !settings?.allowVoteChange) {
      return res.status(400).json({ error: 'Modifica voto non consentita' });
    }
    
    if (existingVotes.length > 0) {
      for (const vote of existingVotes) {
        await db.update(feedPollOptions)
          .set({ voteCount: sql`GREATEST(${feedPollOptions.voteCount} - 1, 0)` })
          .where(eq(feedPollOptions.id, vote.optionId));
      }
      
      await db.delete(feedPollVotes)
        .where(and(
          eq(feedPollVotes.postId, postId),
          eq(feedPollVotes.userId, userId)
        ));
    }
    
    for (const optionId of optionIds) {
      await db.insert(feedPollVotes).values({
        postId,
        optionId,
        userId,
        isAnonymous
      });
      
      await db.update(feedPollOptions)
        .set({ voteCount: sql`${feedPollOptions.voteCount} + 1` })
        .where(eq(feedPollOptions.id, optionId));
    }
    
    const options = await db.select().from(feedPollOptions)
      .where(eq(feedPollOptions.postId, postId))
      .orderBy(asc(feedPollOptions.sortOrder));
    
    const totalVotes = options.reduce((sum, opt) => sum + (opt.voteCount || 0), 0);
    
    res.json({
      options: options.map(opt => ({
        ...opt,
        percentage: totalVotes > 0 ? Math.round((opt.voteCount || 0) / totalVotes * 100) : 0,
        isSelected: optionIds.includes(opt.id)
      })),
      totalVotes,
      hasVoted: true
    });
  } catch (error) {
    handleApiError(error, res);
  }
});

router.post('/posts/:postId/favorite', requirePermission('communication.write'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { postId } = req.params;
    
    const existing = await db.select().from(feedUserFavorites)
      .where(and(
        eq(feedUserFavorites.postId, postId),
        eq(feedUserFavorites.userId, userId)
      )).limit(1);
    
    if (existing.length > 0) {
      await db.delete(feedUserFavorites)
        .where(and(
          eq(feedUserFavorites.postId, postId),
          eq(feedUserFavorites.userId, userId)
        ));
      
      res.json({ action: 'removed', isFavorited: false });
    } else {
      await db.insert(feedUserFavorites).values({
        postId,
        userId
      });
      
      res.json({ action: 'added', isFavorited: true });
    }
  } catch (error) {
    handleApiError(error, res);
  }
});

router.post('/posts/:postId/unfollow', requirePermission('communication.write'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { postId } = req.params;
    
    const existing = await db.select().from(feedUserUnfollows)
      .where(and(
        eq(feedUserUnfollows.postId, postId),
        eq(feedUserUnfollows.userId, userId)
      )).limit(1);
    
    if (existing.length > 0) {
      await db.delete(feedUserUnfollows)
        .where(and(
          eq(feedUserUnfollows.postId, postId),
          eq(feedUserUnfollows.userId, userId)
        ));
      
      res.json({ action: 'following', isUnfollowed: false });
    } else {
      await db.insert(feedUserUnfollows).values({
        postId,
        userId
      });
      
      res.json({ action: 'unfollowed', isUnfollowed: true });
    }
  } catch (error) {
    handleApiError(error, res);
  }
});

router.post('/posts/:postId/pin', requirePermission('communication.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const { postId } = req.params;
    
    const [post] = await db.select().from(feedPosts)
      .where(and(
        eq(feedPosts.id, postId),
        eq(feedPosts.tenantId, tenantId)
      ));
    
    if (!post) {
      return res.status(404).json({ error: 'Post non trovato' });
    }
    
    const [updatedPost] = await db.update(feedPosts)
      .set({ isPinned: !post.isPinned })
      .where(eq(feedPosts.id, postId))
      .returning();
    
    res.json({ isPinned: updatedPost.isPinned });
  } catch (error) {
    handleApiError(error, res);
  }
});

router.get('/badges/leaderboard', requirePermission('communication.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    
    const leaderboard = await db.select({
      userId: userBadges.userId,
      userName: users.name,
      userAvatar: users.profileImageUrl,
      badgeCount: sql<number>`count(*)::int`
    })
    .from(userBadges)
    .leftJoin(users, eq(userBadges.userId, users.id))
    .where(eq(userBadges.tenantId, tenantId))
    .groupBy(userBadges.userId, users.name, users.profileImageUrl)
    .orderBy(desc(sql`count(*)`))
    .limit(10);
    
    res.json(leaderboard);
  } catch (error) {
    handleApiError(error, res);
  }
});

router.get('/badges/user/:userId', requirePermission('communication.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const { userId } = req.params;
    
    const badges = await db.select({
      badge: userBadges,
      awardedBy: {
        id: users.id,
        name: users.name,
        avatar: users.profileImageUrl
      }
    })
    .from(userBadges)
    .leftJoin(users, eq(userBadges.awardedByUserId, users.id))
    .where(and(
      eq(userBadges.tenantId, tenantId),
      eq(userBadges.userId, userId)
    ))
    .orderBy(desc(userBadges.createdAt));
    
    const badgeCounts = badges.reduce((acc: any, { badge }) => {
      acc[badge.badgeType] = (acc[badge.badgeType] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      badges: badges.map(b => ({
        ...b.badge,
        awardedBy: b.awardedBy
      })),
      counts: badgeCounts,
      totalBadges: badges.length
    });
  } catch (error) {
    handleApiError(error, res);
  }
});

router.get('/stats', requirePermission('communication.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    const [totalPosts] = await db.select({
      count: sql<number>`count(*)::int`
    }).from(feedPosts)
      .where(and(
        eq(feedPosts.tenantId, tenantId),
        eq(feedPosts.isActive, true)
      ));
    
    const [unreadCount] = await db.select({
      count: sql<number>`count(*)::int`
    }).from(feedPosts)
      .leftJoin(feedPostReads, and(
        eq(feedPostReads.postId, feedPosts.id),
        eq(feedPostReads.userId, userId)
      ))
      .where(and(
        eq(feedPosts.tenantId, tenantId),
        eq(feedPosts.isActive, true),
        isNull(feedPostReads.id)
      ));
    
    const [myBadgesCount] = await db.select({
      count: sql<number>`count(*)::int`
    }).from(userBadges)
      .where(and(
        eq(userBadges.tenantId, tenantId),
        eq(userBadges.userId, userId)
      ));
    
    res.json({
      totalPosts: totalPosts?.count || 0,
      unreadPosts: unreadCount?.count || 0,
      myBadges: myBadgesCount?.count || 0
    });
  } catch (error) {
    handleApiError(error, res);
  }
});

export default router;
