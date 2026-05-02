# Stage 1 - REST API Contract

The campus notification platform needs to create notices, read student-specific feeds, isolate unread items, mark notices as read, delete obsolete notices, count unread notices, and expose a priority inbox for the most urgent unread work. The API uses JSON, UTC timestamps, camelCase response fields, and plural resource names because clients usually think in collections: notifications first, then filters such as unread or priority.

## Notification Object

```json
{
  "id": "uuid",
  "studentId": "RA2311027010173",
  "notificationType": "Placement",
  "message": "Interview slot opened for the backend role.",
  "isRead": false,
  "createdAt": "2026-05-02T10:15:30.000Z",
  "updatedAt": "2026-05-02T10:15:30.000Z"
}
```

The `notificationType` enum is `"Placement" | "Event" | "Result"`. The ID is a UUID because notification creation can happen from several workers without a central sequence bottleneck.

## Endpoints

`POST /api/notifications`

Headers: `Content-Type: application/json`

Request:

```json
{
  "studentId": "RA2311027010173",
  "notificationType": "Placement",
  "message": "Drive registration closes tonight."
}
```

Response `201`:

```json
{
  "success": true,
  "payload": {
    "id": "9e06352c-e397-4ae9-88d9-85e7f87c7b22",
    "studentId": "RA2311027010173",
    "notificationType": "Placement",
    "message": "Drive registration closes tonight.",
    "isRead": false,
    "createdAt": "2026-05-02T10:15:30.000Z",
    "updatedAt": "2026-05-02T10:15:30.000Z"
  }
}
```

`GET /api/notifications/{studentId}`

Response `200`:

```json
{
  "success": true,
  "payload": {
    "notifications": []
  }
}
```

`GET /api/notifications/{studentId}/unread`

Response `200`:

```json
{
  "success": true,
  "payload": {
    "notifications": []
  }
}
```

`PATCH /api/notifications/{id}/read`

Response `200`: returns the updated notification object with `isRead: true`.

`DELETE /api/notifications/{id}`

Response `204`: empty body.

`GET /api/notifications/unread/count/{studentId}`

Response `200`:

```json
{
  "success": true,
  "payload": {
    "studentId": "RA2311027010173",
    "unreadCount": 7
  }
}
```

`GET /api/notifications/priority/{studentId}`

Response `200`: top ten unread notifications sorted by business weight and recency.

## Real-Time Mechanism

I would use Server-Sent Events for the first production version. Notifications move server-to-client, and the browser already supports one durable stream per student dashboard without a custom heartbeat protocol. WebSockets are useful when the student also sends frequent real-time actions, but this feed is mostly one-way.

Connection flow:

1. Student opens dashboard and calls `GET /api/notification-stream/{studentId}`.
2. Server accepts the stream, stores the connection under that student ID, and sends an initial `connected` event.
3. When a notification is created, the API writes to PostgreSQL, invalidates cache, then emits `notification.created` on that student's stream.
4. Browser inserts the card into the local feed and updates unread count.
5. If the stream drops, the browser reconnects with `Last-Event-ID`, and the server replays missed events from a small durable event table.

# Stage 2 - Database Design

PostgreSQL is the right default because the data is relational, transactional, and query-heavy by student, read state, type, and timestamp. It also gives partial indexes, strong constraints, and predictable pagination strategies without needing an ORM.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  student_id TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('Placement', 'Event', 'Result')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_student_created
  ON notifications (student_id, created_at DESC);

CREATE INDEX idx_notifications_student_unread_created
  ON notifications (student_id, created_at DESC)
  WHERE is_read = FALSE;

CREATE INDEX idx_notifications_type_created
  ON notifications (notification_type, created_at DESC);
```

At 50k students and millions of notifications, the main risks are unbounded feed reads, slow unread scans, vacuum pressure from frequent read updates, hot students with thousands of rows, and growing index size. The answer is not one giant cache; it is narrower queries, partial indexes, pagination, cache invalidation, and eventually partitioning by month if retention grows.

Create notification:

```sql
INSERT INTO notifications (id, student_id, notification_type, message)
VALUES ($1, $2, $3, $4)
RETURNING id, student_id, notification_type, message, is_read, created_at, updated_at;
```

Get all notifications for a student:

```sql
SELECT id, student_id, notification_type, message, is_read, created_at, updated_at
FROM notifications
WHERE student_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

Get unread notifications:

```sql
SELECT id, student_id, notification_type, message, is_read, created_at, updated_at
FROM notifications
WHERE student_id = $1 AND is_read = FALSE
ORDER BY created_at DESC
LIMIT $2;
```

Mark as read:

```sql
UPDATE notifications
SET is_read = TRUE, updated_at = NOW()
WHERE id = $1
RETURNING id, student_id, notification_type, message, is_read, created_at, updated_at;
```

Delete notification:

```sql
DELETE FROM notifications
WHERE id = $1
RETURNING id;
```

Count unread:

```sql
SELECT COUNT(*)::INT AS unread_total
FROM notifications
WHERE student_id = $1 AND is_read = FALSE;
```

# Stage 3 - Slow Query Analysis

Query:

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

The query is not accurate for the proposed schema. It uses mixed-case names that do not match `student_id`, `is_read`, and `created_at`; `studentID = 1042` also treats the student as a number even though IDs are usually strings. `SELECT *` is wasteful because the client rarely needs every column forever, and it prevents the team from thinking about payload size.

It is slow at 5M notifications because the database may scan many rows, filter unread rows after the scan, then sort the remaining rows. The cost trends toward `O(total_rows)` for filtering plus `O(matches log matches)` for sorting when no useful index exists.

I would change the query to use exact column names, project only needed fields, add a partial composite index, and apply a limit. With the partial index, lookup becomes close to `O(log unread_rows_for_student + page_size)` because the index is already grouped by student and ordered by newest unread rows.

Indexing every column is poor advice. Each index costs disk, memory, insert time, update time, and vacuum work. Indexes should match access paths, not anxiety. A low-cardinality boolean index alone is usually weak; a partial index on unread rows for each student is much sharper.

Optimized query:

```sql
CREATE INDEX idx_notifications_student_unread_created
  ON notifications (student_id, created_at DESC)
  WHERE is_read = FALSE;

SELECT id, notification_type, message, created_at
FROM notifications
WHERE student_id = $1 AND is_read = FALSE
ORDER BY created_at DESC
LIMIT 50;
```

Students who received a Placement notification in the last seven days:

```sql
SELECT DISTINCT student_id
FROM notifications
WHERE notification_type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days';
```

# Stage 4 - Reducing Page-Load Pressure

Client-side caching can use `ETag` and `Cache-Control: private, max-age=30`. The client sends `If-None-Match`, and the server returns `304 Not Modified` when the feed has not changed. This reduces payload and DB work, but stale data is possible for a short window unless real-time events refresh the client.

Server-side in-memory cache stores recent student feeds for a short TTL. It gives a big win for repeated dashboard reloads and tab switches. The tradeoff is memory cost and invalidation complexity: create, read, delete, and bulk insert operations must evict affected student keys.

Pagination avoids pulling a student's entire history on every page load. It lowers DB work, memory use, and network payload. The tradeoff is UX: older notifications need scrolling or a "load more" interaction, and the API must maintain stable ordering with cursor or timestamp-based pagination.

Real-time push with SSE avoids polling loops. The student receives new notifications as they happen, and the normal feed endpoint becomes an initial snapshot instead of a constant refresh target. The tradeoff is long-lived connections, reconnect logic, and horizontal scaling through a shared pub/sub layer.

Recommended combination: paginated initial fetch, short server cache for the first page, ETags for reloads, and SSE for new notifications. That blend attacks the actual pressure points without making every request depend on a heavy distributed system from day one.

# Stage 5 - Bulk Notification Redesign

The pseudocode is sequential, blocks on slow email calls, mixes three responsibilities, has no retry or idempotency, and leaves the system inconsistent when one side effect fails. Its time complexity is linear in students, but the practical runtime is worse because each iteration waits for network I/O. It also has no bulk insert, no backpressure, and no record of which students failed.

If email fails for 200 students midway, the current function has already saved some rows and pushed some real-time messages. Rolling back everything is not realistic because external emails and pushes cannot be un-sent. The system should instead record delivery status, retry failed email jobs, and let support inspect permanent failures.

The redesign separates durable notification creation from delivery. First, write notification rows in batches. Then enqueue delivery jobs for email and push workers. Workers use retry policies and idempotency keys. Permanent failures go to a dead letter queue with student ID, notification ID, channel, attempt count, and last error.

Database saving and email sending should not be one atomic transaction. The database transaction is local and controllable; email is an external side effect. The outbox pattern is the better boundary: commit the notification and an outbox row together, then deliver asynchronously.

Revised pseudocode:

```ts
async function notifyAllStudents(studentIds: string[], message: string, notificationType: NotificationType) {
  const batchSize = 500;

  for (const recipientSlice of chunk(studentIds, batchSize)) {
    await db.transaction(async (tx) => {
      const insertedNotifications = await tx.bulkInsertNotifications(
        recipientSlice.map((studentId) => ({
          id: uuid(),
          studentId,
          notificationType,
          message,
          isRead: false
        }))
      );

      await tx.bulkInsertOutbox(
        insertedNotifications.flatMap((notificationCard) => [
          {
            id: uuid(),
            notificationId: notificationCard.id,
            studentId: notificationCard.studentId,
            channel: "email",
            status: "queued",
            attemptCount: 0
          },
          {
            id: uuid(),
            notificationId: notificationCard.id,
            studentId: notificationCard.studentId,
            channel: "push",
            status: "queued",
            attemptCount: 0
          }
        ])
      );
    });

    await queue.publish("notification-delivery", {
      batchStudentIds: recipientSlice,
      messageFingerprint: hash(message)
    });
  }
}

async function deliveryWorker(job: DeliveryJob) {
  const pendingDeliveries = await db.claimOutboxRows(job.batchStudentIds, 100);

  for (const deliveryTicket of pendingDeliveries) {
    try {
      if (deliveryTicket.channel === "email") {
        await emailProvider.send(deliveryTicket.studentId, deliveryTicket.notificationId);
      }

      if (deliveryTicket.channel === "push") {
        await pushGateway.send(deliveryTicket.studentId, deliveryTicket.notificationId);
      }

      await db.markOutboxDelivered(deliveryTicket.id);
    } catch (deliveryFailure) {
      const nextAttempt = deliveryTicket.attemptCount + 1;

      if (nextAttempt <= 5) {
        await db.scheduleOutboxRetry(deliveryTicket.id, nextAttempt, backoffMs(nextAttempt));
        await queue.publishDelayed("notification-delivery", job, backoffMs(nextAttempt));
      } else {
        await db.moveOutboxToDeadLetter(deliveryTicket.id, String(deliveryFailure));
      }
    }
  }
}
```

# Stage 6 - Priority Inbox TypeScript

Formula: `combinedScore = typeWeight * 0.6 + recencyScore * 0.4`. Placement deserves the strongest pull because it can affect career deadlines, Result is next because it changes student decisions, and Event remains visible without overpowering urgent academic or career notices. Recency is normalized between the oldest and newest timestamps in the fetched batch.

The code below uses a fixed-size min-heap to keep only the best ten notifications. For a stream of new notifications, each arrival is scored and offered to the heap. If it is better than the weakest current top-ten entry, it replaces that entry. This keeps continuous updates at `O(log n)` where `n` is the requested inbox size, not the full feed size.

```ts
type ExternalNotificationType = "Placement" | "Result" | "Event";

interface ExternalNotification {
  ID: string | number;
  Type: ExternalNotificationType;
  Message: string;
  Timestamp: string;
}

interface ExternalEnvelope {
  notifications: ExternalNotification[];
}

interface ScoredNotification extends ExternalNotification {
  typeWeight: number;
  recencyScore: number;
  combinedScore: number;
}

const typeWeights: Record<ExternalNotificationType, number> = {
  Placement: 3,
  Result: 2,
  Event: 1
};

class TopNotificationHeap {
  private readonly heapShelf: ScoredNotification[] = [];

  constructor(private readonly capacity: number) {}

  offer(notificationCard: ScoredNotification): void {
    if (this.heapShelf.length < this.capacity) {
      this.heapShelf.push(notificationCard);
      this.bubbleUp(this.heapShelf.length - 1);
      return;
    }

    if (notificationCard.combinedScore <= this.heapShelf[0].combinedScore) {
      return;
    }

    this.heapShelf[0] = notificationCard;
    this.sinkDown(0);
  }

  toSortedList(): ScoredNotification[] {
    return [...this.heapShelf].sort((leftCard, rightCard) => rightCard.combinedScore - leftCard.combinedScore);
  }

  private bubbleUp(index: number): void {
    let childIndex = index;
    while (childIndex > 0) {
      const parentIndex = Math.floor((childIndex - 1) / 2);
      if (this.heapShelf[parentIndex].combinedScore <= this.heapShelf[childIndex].combinedScore) {
        break;
      }

      [this.heapShelf[parentIndex], this.heapShelf[childIndex]] = [this.heapShelf[childIndex], this.heapShelf[parentIndex]];
      childIndex = parentIndex;
    }
  }

  private sinkDown(index: number): void {
    let parentIndex = index;

    while (true) {
      const leftIndex = parentIndex * 2 + 1;
      const rightIndex = parentIndex * 2 + 2;
      let weakestIndex = parentIndex;

      if (leftIndex < this.heapShelf.length && this.heapShelf[leftIndex].combinedScore < this.heapShelf[weakestIndex].combinedScore) {
        weakestIndex = leftIndex;
      }

      if (rightIndex < this.heapShelf.length && this.heapShelf[rightIndex].combinedScore < this.heapShelf[weakestIndex].combinedScore) {
        weakestIndex = rightIndex;
      }

      if (weakestIndex === parentIndex) {
        break;
      }

      [this.heapShelf[parentIndex], this.heapShelf[weakestIndex]] = [this.heapShelf[weakestIndex], this.heapShelf[parentIndex]];
      parentIndex = weakestIndex;
    }
  }
}

async function fetchPriorityNotifications(): Promise<ExternalNotification[]> {
  const baseUrl = process.env.EVALUATION_BASE_URL ?? "http://20.207.122.201";
  const token = process.env.EVALUATION_API_TOKEN;

  if (!token) {
    throw new Error("EVALUATION_API_TOKEN must be present in the environment.");
  }

  const notificationReply = await fetch(`${baseUrl}/evaluation-service/notifications`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!notificationReply.ok) {
    throw new Error(`Notification API returned HTTP ${notificationReply.status}`);
  }

  const notificationEnvelope = (await notificationReply.json()) as ExternalEnvelope;
  return Array.isArray(notificationEnvelope.notifications) ? notificationEnvelope.notifications : [];
}

function scoreNotifications(notificationShelf: ExternalNotification[]): ScoredNotification[] {
  const timestampShelf = notificationShelf.map((notificationCard) => new Date(notificationCard.Timestamp).getTime());
  const oldestTimestamp = Math.min(...timestampShelf);
  const newestTimestamp = Math.max(...timestampShelf);
  const timestampSpread = Math.max(1, newestTimestamp - oldestTimestamp);

  return notificationShelf.map((notificationCard) => {
    const recencyScore = (new Date(notificationCard.Timestamp).getTime() - oldestTimestamp) / timestampSpread;
    const typeWeight = typeWeights[notificationCard.Type] ?? 0;

    return {
      ...notificationCard,
      typeWeight,
      recencyScore,
      combinedScore: typeWeight * 0.6 + recencyScore * 0.4
    };
  });
}

async function printTopPriorityInbox(): Promise<void> {
  const notificationShelf = await fetchPriorityNotifications();
  const topHeap = new TopNotificationHeap(10);

  for (const notificationCard of scoreNotifications(notificationShelf)) {
    topHeap.offer(notificationCard);
  }

  const topTen = topHeap.toSortedList();
  process.stdout.write("Top 10 priority notifications\n");
  topTen.forEach((notificationCard, index) => {
    process.stdout.write(
      `${index + 1}. [${notificationCard.Type}] score=${notificationCard.combinedScore.toFixed(3)} id=${notificationCard.ID} at=${notificationCard.Timestamp} message=${notificationCard.Message}\n`
    );
  });
}

void printTopPriorityInbox().catch((priorityFailure) => {
  process.stderr.write(`Priority inbox failed: ${priorityFailure instanceof Error ? priorityFailure.message : "unknown failure"}\n`);
});
```

For an initial batch of `m` notifications and top size `n = 10`, the heap approach costs `O(m log n)` and stores `O(n)` selected notifications plus the fetched batch. With continuous arrivals, the same `offer` method updates the top ten without re-sorting the full history.
