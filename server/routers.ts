import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  meals: router({
    // Record a meal (lunch or dinner)
    create: protectedProcedure
      .input(
        z.object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          mealType: z.enum(["lunch", "dinner"]),
          dishName: z.string().min(1).max(255),
          category: z.enum(["japanese", "western", "chinese", "other"]),
          note: z.string().max(500).optional(),
          imageUrl: z.string().url().optional(),
          groupId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createMealRecord({
          userId: ctx.user.id,
          groupId: input.groupId || null,
          date: input.date,
          mealType: input.mealType,
          dishName: input.dishName,
          category: input.category,
          note: input.note || null,
          imageUrl: input.imageUrl || null,
        });
        return { id };
      }),

    // Get meals for a specific date
    getByDate: protectedProcedure
      .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .query(async ({ ctx, input }) => {
        return db.getMealsByDate(ctx.user.id, input.date);
      }),

    // Get today's lunch
    getTodayLunch: protectedProcedure
      .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .query(async ({ ctx, input }) => {
        return db.getTodayLunch(ctx.user.id, input.date);
      }),

    // Get recent meals
    getRecent: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
      .query(async ({ ctx, input }) => {
        return db.getRecentMeals(ctx.user.id, input.limit);
      }),

    // Get meals by date range
    getByDateRange: protectedProcedure
      .input(
        z.object({
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        })
      )
      .query(async ({ ctx, input }) => {
        return db.getMealsByDateRange(ctx.user.id, input.startDate, input.endDate);
      }),

    // Delete a meal record
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteMealRecord(input.id, ctx.user.id);
        return { success: true };
      }),

    // Sync local meals to server (for guest to authenticated user migration)
    syncLocalMeals: protectedProcedure
      .input(
        z.array(
          z.object({
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            mealType: z.enum(["lunch", "dinner"]),
            dishName: z.string().min(1).max(255),
            category: z.enum(["japanese", "western", "chinese", "other"]),
            note: z.string().max(500).optional(),
            createdAt: z.string(),
          })
        )
      )
      .mutation(async ({ ctx, input }) => {
        const results = [];
        for (const meal of input) {
          try {
            const id = await db.createMealRecord({
              userId: ctx.user.id,
              groupId: null,
              date: meal.date,
              mealType: meal.mealType,
              dishName: meal.dishName,
              category: meal.category,
              note: meal.note || null,
              imageUrl: null,
            });
            results.push({ success: true, id, originalCreatedAt: meal.createdAt });
          } catch (error) {
            console.error("Failed to sync meal:", meal, error);
            results.push({ success: false, error: String(error), originalCreatedAt: meal.createdAt });
          }
        }
        return results;
      }),
  }),

  // Image analysis for food photos
  imageAnalysis: router({
    // Upload and analyze food image
    analyzeFood: protectedProcedure
      .input(
        z.object({
          imageBase64: z.string(),
          mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Upload image to storage
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const extension = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
        const fileKey = `meals/${ctx.user.id}/${timestamp}-${randomSuffix}.${extension}`;
        
        const imageBuffer = Buffer.from(input.imageBase64, "base64");
        const { url: imageUrl } = await storagePut(fileKey, imageBuffer, input.mimeType);

        // Analyze image with LLM
        const prompt = `この食事の写真を分析して、以下の情報をJSON形式で返してください:
1. 料理名（日本語で）
2. カテゴリ（japanese/western/chinese/otherのいずれか）
3. 簡単な説明（30文字以内）

必ず以下のJSON形式で回答してください:
{
  "dishName": "料理名",
  "category": "japanese/western/chinese/other",
  "description": "簡単な説明"
}`;

        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "あなたは食事の写真を分析する専門家です。写真から料理を特定し、JSON形式で情報を返してください。",
              },
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  {
                    type: "image_url",
                    image_url: {
                      url: imageUrl,
                      detail: "high",
                    },
                  },
                ],
              },
            ],
            response_format: { type: "json_object" },
          });

          const content = response.choices[0]?.message?.content;
          if (!content || typeof content !== "string") {
            throw new Error("No response from LLM");
          }

          let parsed;
          try {
            parsed = JSON.parse(content);
          } catch (parseError) {
            console.error("Failed to parse LLM response:", parseError);
            throw new Error("Invalid JSON response from LLM");
          }

          return {
            imageUrl,
            dishName: parsed.dishName || "不明な料理",
            category: parsed.category || "other",
            description: parsed.description || "",
          };
        } catch (error) {
          console.error("Failed to analyze image:", error);
          return {
            imageUrl,
            dishName: "",
            category: "other" as const,
            description: "画像の解析に失敗しました。手動で入力してください。",
          };
        }
      }),
  }),

  recommendations: router({
    // Get dinner recommendations based on today's lunch
    getDinnerRecommendations: protectedProcedure
      .input(
        z.object({
          lunchDishName: z.string(),
          lunchCategory: z.enum(["japanese", "western", "chinese", "other"]),
        })
      )
      .mutation(async ({ input }) => {
        const categoryNames: Record<string, string> = {
          japanese: "和食",
          western: "洋食",
          chinese: "中華",
          other: "その他",
        };

        const prompt = `あなたは栄養バランスを考慮した食事アドバイザーです。
ユーザーの今日のランチ情報に基づいて、夜ご飯のおすすめメニューを3つ提案してください。

今日のランチ:
- 料理名: ${input.lunchDishName}
- カテゴリ: ${categoryNames[input.lunchCategory]}

以下の点を考慮してください:
1. 栄養バランス（ランチで不足している栄養素を補う）
2. 味のバリエーション（ランチと異なる味付けや調理法）
3. カテゴリのバランス（できればランチと異なるカテゴリ）
4. 日本の家庭で作りやすい料理

必ず以下のJSON形式で回答してください:
{
  "recommendations": [
    {
      "name": "料理名",
      "category": "japanese/western/chinese/other",
      "reason": "おすすめの理由（50文字以内）"
    }
  ]
}`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "あなたは日本の家庭料理に詳しい栄養アドバイザーです。必ずJSON形式で回答してください。" },
              { role: "user", content: prompt },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "dinner_recommendations",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    recommendations: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          category: { type: "string", enum: ["japanese", "western", "chinese", "other"] },
                          reason: { type: "string" },
                        },
                        required: ["name", "category", "reason"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["recommendations"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = response.choices[0]?.message?.content;
          if (!content || typeof content !== 'string') {
            throw new Error("No response from LLM");
          }

          const parsed = JSON.parse(content);
          return parsed.recommendations;
        } catch (error) {
          console.error("Failed to get recommendations:", error);
          // Fallback recommendations
          return [
            {
              name: "焼き魚定食",
              category: "japanese",
              reason: "バランスの良い和食でヘルシーです",
            },
            {
              name: "野菜たっぷりスープ",
              category: "western",
              reason: "野菜をしっかり摂れます",
            },
            {
              name: "豆腐ハンバーグ",
              category: "japanese",
              reason: "タンパク質を補給できます",
            },
          ];
        }
      }),

    // Get group dinner recommendations based on all members' lunches
    getGroupDinnerRecommendations: protectedProcedure
      .input(
        z.object({
          groupId: z.number(),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        })
      )
      .mutation(async ({ input }) => {
        const meals = await db.getGroupMealsForDate(input.groupId, input.date);
        const lunches = meals.filter(m => m.mealType === "lunch");

        if (lunches.length === 0) {
          return {
            recommendations: [
              { name: "焼き魚定食", category: "japanese", reason: "バランスの良い和食でヘルシーです" },
              { name: "野菜たっぷりスープ", category: "western", reason: "野菜をしっかり摂れます" },
              { name: "豆腐ハンバーグ", category: "japanese", reason: "タンパク質を補給できます" },
            ],
            memberLunches: [],
          };
        }

        const categoryNames: Record<string, string> = {
          japanese: "和食",
          western: "洋食",
          chinese: "中華",
          other: "その他",
        };

        const lunchSummary = lunches.map(l => `- ${l.userName || "メンバー"}: ${l.dishName}（${categoryNames[l.category]}）`).join("\n");

        const prompt = `あなたは家族の栄養バランスを考慮した食事アドバイザーです。
家族全員の今日のランチ情報に基づいて、夜ご飯のおすすめメニューを3つ提案してください。

今日のランチ:
${lunchSummary}

以下の点を考慮してください:
1. 家族全員の栄養バランス
2. 味のバリエーション
3. 家族で一緒に食べられる料理
4. 日本の家庭で作りやすい料理

必ず以下のJSON形式で回答してください:
{
  "recommendations": [
    {
      "name": "料理名",
      "category": "japanese/western/chinese/other",
      "reason": "おすすめの理由（50文字以内）"
    }
  ]
}`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "あなたは日本の家庭料理に詳しい栄養アドバイザーです。必ずJSON形式で回答してください。" },
              { role: "user", content: prompt },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "dinner_recommendations",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    recommendations: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          category: { type: "string", enum: ["japanese", "western", "chinese", "other"] },
                          reason: { type: "string" },
                        },
                        required: ["name", "category", "reason"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["recommendations"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = response.choices[0]?.message?.content;
          if (!content || typeof content !== 'string') {
            throw new Error("No response from LLM");
          }

          const parsed = JSON.parse(content);
          return {
            recommendations: parsed.recommendations,
            memberLunches: lunches.map(l => ({ name: l.userName, dish: l.dishName, category: l.category })),
          };
        } catch (error) {
          console.error("Failed to get group recommendations:", error);
          return {
            recommendations: [
              { name: "焼き魚定食", category: "japanese", reason: "バランスの良い和食でヘルシーです" },
              { name: "野菜たっぷりスープ", category: "western", reason: "野菜をしっかり摂れます" },
              { name: "豆腐ハンバーグ", category: "japanese", reason: "タンパク質を補給できます" },
            ],
            memberLunches: lunches.map(l => ({ name: l.userName, dish: l.dishName, category: l.category })),
          };
        }
      }),
  }),

  // Shopping list generation from dinner recommendations
  shoppingList: router({
    generateFromDinner: protectedProcedure
      .input(
        z.object({
          dinnerName: z.string(),
          dinnerCategory: z.enum(["japanese", "western", "chinese", "other"]),
        })
      )
      .mutation(async ({ input }) => {
        const categoryNames: Record<string, string> = {
          japanese: "和食",
          western: "洋食",
          chinese: "中華",
          other: "その他",
        };

        const prompt = `あなたは料理の専門家です。以下のディナー料理を作るために必要な食材リストを作成してください。

ディナー料理:
- 料理名: ${input.dinnerName}
- カテゴリ: ${categoryNames[input.dinnerCategory]}

以下の点を考慮してください:
1. 一般的な日本の家庭で手に入りやすい食材
2. 2-4人分の分量
3. 基本的な調味料（塩、醤油、油など）は除外
4. 具体的な食材名と目安の量を記載

必ず以下のJSON形式で回答してください:
{
  "ingredients": [
    {
      "name": "食材名",
      "amount": "量（例: 200g, 1個, 大さじ1）",
      "category": "野菜/肉/魚/乳製品/その他"
    }
  ]
}`;

        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "あなたは料理の専門家です。料理名から必要な食材を正確に推定し、JSON形式で返してください。",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            response_format: { type: "json_object" },
          });

          const content = response.choices[0]?.message?.content;
          if (!content || typeof content !== "string") {
            throw new Error("No response from LLM");
          }

          let parsed;
          try {
            parsed = JSON.parse(content);
          } catch (parseError) {
            console.error("Failed to parse LLM response:", parseError);
            throw new Error("Invalid JSON response from LLM");
          }

          return {
            dinnerName: input.dinnerName,
            ingredients: parsed.ingredients || [],
          };
        } catch (error) {
          console.error("Failed to generate shopping list:", error);
          return {
            dinnerName: input.dinnerName,
            ingredients: [],
            error: "買い物リストの生成に失敗しました",
          };
        }
      }),
  }),

  // Group management
  groups: router({
    // Create a new group
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100),
          description: z.string().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createGroup(input.name, input.description || null, ctx.user.id);
        const group = await db.getGroupById(id);
        return group;
      }),

    // Get user's groups
    myGroups: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserGroups(ctx.user.id);
    }),

    // Get group details
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getGroupById(input.id);
      }),

    // Get group members
    getMembers: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        return db.getGroupMembers(input.groupId);
      }),

    // Join a group by invite code
    join: protectedProcedure
      .input(z.object({ inviteCode: z.string().length(8) }))
      .mutation(async ({ ctx, input }) => {
        const group = await db.getGroupByInviteCode(input.inviteCode);
        if (!group) {
          throw new Error("Invalid invite code");
        }
        await db.joinGroup(group.id, ctx.user.id);
        return group;
      }),

    // Leave a group
    leave: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.leaveGroup(input.groupId, ctx.user.id);
        return { success: true };
      }),

    // Delete a group (owner only)
    delete: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteGroup(input.groupId, ctx.user.id);
        return { success: true };
      }),

    // Get group meals for a date
    getMealsForDate: protectedProcedure
      .input(
        z.object({
          groupId: z.number(),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        })
      )
      .query(async ({ input }) => {
        return db.getGroupMealsForDate(input.groupId, input.date);
      }),
  }),

  // User settings
  settings: router({
    // Get notification settings
    getNotificationSettings: protectedProcedure.query(async ({ ctx }) => {
      return {
        enabled: ctx.user.notificationEnabled ?? true,
        lunchReminderTime: ctx.user.lunchReminderTime ?? "12:00",
      };
    }),

    // Update notification settings
    updateNotificationSettings: protectedProcedure
      .input(
        z.object({
          enabled: z.boolean(),
          lunchReminderTime: z.string().regex(/^\d{2}:\d{2}$/),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.updateUserNotificationSettings(ctx.user.id, input.enabled, input.lunchReminderTime);
        return { success: true };
      }),
  }),

  // Weekly reports and analytics
  reports: router({
    getWeeklyReport: protectedProcedure
      .input(
        z.object({
          weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        })
      )
      .query(async ({ ctx, input }) => {
        const weekEndDate = new Date(input.weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);
        const endDateStr = weekEndDate.toISOString().split('T')[0];

        const meals = await db.getMealsByDateRange(ctx.user.id, input.weekStartDate, endDateStr);

        // Calculate statistics
        const totalMeals = meals.length;
        const lunches = meals.filter(m => m.mealType === 'lunch');
        const dinners = meals.filter(m => m.mealType === 'dinner');

        const categoryStats = {
          japanese: meals.filter(m => m.category === 'japanese').length,
          western: meals.filter(m => m.category === 'western').length,
          chinese: meals.filter(m => m.category === 'chinese').length,
          other: meals.filter(m => m.category === 'other').length,
        };

        // Daily meal completion rate (lunch + dinner per day for 7 days = 14 meals max)
        const dailyMeals: Record<string, { lunch: boolean; dinner: boolean }> = {};
        for (let i = 0; i < 7; i++) {
          const date = new Date(input.weekStartDate);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          dailyMeals[dateStr] = { lunch: false, dinner: false };
        }

        meals.forEach(meal => {
          if (dailyMeals[meal.date]) {
            dailyMeals[meal.date][meal.mealType] = true;
          }
        });

        const completedDays = Object.values(dailyMeals).filter(day => day.lunch && day.dinner).length;
        const completionRate = Math.round((completedDays / 7) * 100);

        return {
          weekStartDate: input.weekStartDate,
          weekEndDate: endDateStr,
          totalMeals,
          lunches: lunches.length,
          dinners: dinners.length,
          categoryStats,
          dailyMeals,
          completionRate,
          meals: meals.map(m => ({
            id: m.id,
            date: m.date,
            mealType: m.mealType,
            dishName: m.dishName,
            category: m.category,
            note: m.note,
          })),
        };
      }),

    getNutritionAdvice: protectedProcedure
      .input(
        z.object({
          weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        })
      )
      .query(async ({ ctx, input }) => {
        const weekEndDate = new Date(input.weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);
        const endDateStr = weekEndDate.toISOString().split('T')[0];

        const meals = await db.getMealsByDateRange(ctx.user.id, input.weekStartDate, endDateStr);

        if (meals.length === 0) {
          return {
            advice: "今週の食事記録がありません。バランスの良い食事を心がけましょう。",
            recommendations: [],
          };
        }

        // Prepare meal summary for LLM
        const mealSummary = meals.map(m =>
          `${m.date} ${m.mealType === 'lunch' ? 'ランチ' : 'ディナー'}: ${m.dishName} (${m.category})`
        ).join('\n');

        const categoryCount = {
          japanese: meals.filter(m => m.category === 'japanese').length,
          western: meals.filter(m => m.category === 'western').length,
          chinese: meals.filter(m => m.category === 'chinese').length,
          other: meals.filter(m => m.category === 'other').length,
        };

        const prompt = `あなたは栄養士です。以下の1週間の食事記録に基づいて、栄養バランスの分析と改善アドバイスを提供してください。

食事記録:
${mealSummary}

カテゴリ別食事数:
- 和食: ${categoryCount.japanese}回
- 洋食: ${categoryCount.western}回
- 中華: ${categoryCount.chinese}回
- その他: ${categoryCount.other}回

以下の点を考慮して分析してください:
1. 栄養バランス（タンパク質、炭水化物、脂質、ビタミン、ミネラル）
2. 食事の多様性
3. 健康的な食事習慣
4. 具体的な改善提案

必ず以下のJSON形式で回答してください:
{
  "analysis": "全体的な分析（200文字以内）",
  "recommendations": [
    "具体的な改善アドバイス1",
    "具体的な改善アドバイス2",
    "具体的な改善アドバイス3"
  ],
  "nutritionScore": 数値（0-100、現在の栄養バランスの評価）
}`;

        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "あなたは経験豊富な栄養士です。食事記録から栄養バランスを分析し、建設的なアドバイスを提供してください。",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            response_format: { type: "json_object" },
          });

          const content = response.choices[0]?.message?.content;
          if (!content || typeof content !== "string") {
            throw new Error("No response from LLM");
          }

          let parsed;
          try {
            parsed = JSON.parse(content);
          } catch (parseError) {
            console.error("Failed to parse LLM response:", parseError);
            throw new Error("Invalid JSON response from LLM");
          }

          return {
            analysis: parsed.analysis || "分析できませんでした",
            recommendations: parsed.recommendations || [],
            nutritionScore: parsed.nutritionScore || 50,
          };
        } catch (error) {
          console.error("Failed to get nutrition advice:", error);
          return {
            analysis: "栄養アドバイスの生成に失敗しました。引き続きバランスの良い食事を心がけてください。",
            recommendations: [
              "野菜を積極的に摂取しましょう",
              "タンパク質をバランスよく取りましょう",
              "食事の時間を一定に保ちましょう",
            ],
            nutritionScore: 50,
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
