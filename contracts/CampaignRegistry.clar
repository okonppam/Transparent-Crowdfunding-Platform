(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-GOAL u101)
(define-constant ERR-INVALID-DEADLINE u102)
(define-constant ERR-INVALID-DESCRIPTION u103)
(define-constant ERR-INVALID-TITLE u104)
(define-constant ERR-INVALID-CATEGORY u105)
(define-constant ERR-CAMPAIGN-ALREADY-EXISTS u106)
(define-constant ERR-CAMPAIGN-NOT-FOUND u107)
(define-constant ERR-INVALID-TIMESTAMP u108)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u109)
(define-constant ERR-INVALID-MIN-CONTRIB u110)
(define-constant ERR-INVALID-MAX-CONTRIB u111)
(define-constant ERR-CAMPAIGN-UPDATE-NOT-ALLOWED u112)
(define-constant ERR-INVALID-UPDATE-PARAM u113)
(define-constant ERR-MAX-CAMPAIGNS-EXCEEDED u114)
(define-constant ERR-INVALID-CAMPAIGN-TYPE u115)
(define-constant ERR-INVALID-REWARD-TIERS u116)
(define-constant ERR-INVALID-LOCATION u117)
(define-constant ERR-INVALID-CURRENCY u118)
(define-constant ERR-INVALID-STATUS u119)
(define-constant ERR-INVALID-CREATOR u120)
(define-constant ERR-INVALID-START-TIME u121)
(define-constant ERR-INVALID-END-TIME u122)
(define-constant ERR-INVALID-FUNDING-THRESHOLD u123)
(define-constant ERR-INVALID-REFUND-POLICY u124)
(define-constant ERR-INVALID-VOTING_PERIOD u125)

(define-data-var next-campaign-id uint u0)
(define-data-var max-campaigns uint u10000)
(define-data-var creation-fee uint u500)
(define-data-var authority-contract (optional principal) none)

(define-map campaigns
  uint
  {
    title: (string-utf8 100),
    description: (string-utf8 500),
    goal: uint,
    deadline: uint,
    raised: uint,
    timestamp: uint,
    creator: principal,
    category: (string-utf8 50),
    reward-tiers: uint,
    location: (string-utf8 100),
    currency: (string-utf8 20),
    status: bool,
    min-contrib: uint,
    max-contrib: uint,
    campaign-type: (string-utf8 50),
    start-time: uint,
    end-time: uint,
    funding-threshold: uint,
    refund-policy: bool,
    voting-period: uint
  }
)

(define-map campaigns-by-title
  (string-utf8 100)
  uint)

(define-map campaign-updates
  uint
  {
    update-title: (string-utf8 100),
    update-goal: uint,
    update-deadline: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-campaign (id uint))
  (map-get? campaigns id)
)

(define-read-only (get-campaign-updates (id uint))
  (map-get? campaign-updates id)
)

(define-read-only (is-campaign-registered (title (string-utf8 100)))
  (is-some (map-get? campaigns-by-title title))
)

(define-private (validate-title (title (string-utf8 100)))
  (if (and (> (len title) u0) (<= (len title) u100))
      (ok true)
      (err ERR-INVALID-TITLE))
)

(define-private (validate-description (desc (string-utf8 500)))
  (if (and (> (len desc) u0) (<= (len desc) u500))
      (ok true)
      (err ERR-INVALID-DESCRIPTION))
)

(define-private (validate-goal (goal uint))
  (if (> goal u0)
      (ok true)
      (err ERR-INVALID-GOAL))
)

(define-private (validate-deadline (deadline uint))
  (if (> deadline block-height)
      (ok true)
      (err ERR-INVALID-DEADLINE))
)

(define-private (validate-category (cat (string-utf8 50)))
  (if (and (> (len cat) u0) (<= (len cat) u50))
      (ok true)
      (err ERR-INVALID-CATEGORY))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-campaign-type (type (string-utf8 50)))
  (if (or (is-eq type u"equity") (is-eq type u"reward") (is-eq type u"donation"))
      (ok true)
      (err ERR-INVALID-CAMPAIGN-TYPE))
)

(define-private (validate-reward-tiers (tiers uint))
  (if (<= tiers u10)
      (ok true)
      (err ERR-INVALID-REWARD-TIERS))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-currency (cur (string-utf8 20)))
  (if (or (is-eq cur u"STX") (is-eq cur u"USD") (is-eq cur u"BTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)

(define-private (validate-min-contrib (min uint))
  (if (> min u0)
      (ok true)
      (err ERR-INVALID-MIN-CONTRIB))
)

(define-private (validate-max-contrib (max uint))
  (if (> max u0)
      (ok true)
      (err ERR-INVALID-MAX-CONTRIB))
)

(define-private (validate-start-time (start uint))
  (if (>= start block-height)
      (ok true)
      (err ERR-INVALID-START-TIME))
)

(define-private (validate-end-time (end uint) (start uint))
  (if (> end start)
      (ok true)
      (err ERR-INVALID-END-TIME))
)

(define-private (validate-funding-threshold (thresh uint) (goal uint))
  (if (<= thresh goal)
      (ok true)
      (err ERR-INVALID-FUNDING-THRESHOLD))
)

(define-private (validate-refund-policy (policy bool))
  (ok true)
)

(define-private (validate-voting-period (period uint))
  (if (> period u0)
      (ok true)
      (err ERR-INVALID-VOTING-PERIOD))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p tx-sender))
      (ok true)
      (err ERR-INVALID-CREATOR))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-campaigns (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-MAX-CAMPAIGNS-EXCEEDED))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-campaigns new-max)
    (ok true)
  )
)

(define-public (set-creation-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set creation-fee new-fee)
    (ok true)
  )
)

(define-public (create-campaign
  (title (string-utf8 100))
  (description (string-utf8 500))
  (goal uint)
  (deadline uint)
  (category (string-utf8 50))
  (reward-tiers uint)
  (location (string-utf8 100))
  (currency (string-utf8 20))
  (min-contrib uint)
  (max-contrib uint)
  (campaign-type (string-utf8 50))
  (start-time uint)
  (end-time uint)
  (funding-threshold uint)
  (refund-policy bool)
  (voting-period uint)
)
  (let (
        (next-id (var-get next-campaign-id))
        (current-max (var-get max-campaigns))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-CAMPAIGNS-EXCEEDED))
    (try! (validate-title title))
    (try! (validate-description description))
    (try! (validate-goal goal))
    (try! (validate-deadline deadline))
    (try! (validate-category category))
    (try! (validate-campaign-type campaign-type))
    (try! (validate-reward-tiers reward-tiers))
    (try! (validate-location location))
    (try! (validate-currency currency))
    (try! (validate-min-contrib min-contrib))
    (try! (validate-max-contrib max-contrib))
    (try! (validate-start-time start-time))
    (try! (validate-end-time end-time start-time))
    (try! (validate-funding-threshold funding-threshold goal))
    (try! (validate-refund-policy refund-policy))
    (try! (validate-voting-period voting-period))
    (asserts! (is-none (map-get? campaigns-by-title title)) (err ERR-CAMPAIGN-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get creation-fee) tx-sender authority-recipient))
    )
    (map-set campaigns next-id
      {
        title: title,
        description: description,
        goal: goal,
        deadline: deadline,
        raised: u0,
        timestamp: block-height,
        creator: tx-sender,
        category: category,
        reward-tiers: reward-tiers,
        location: location,
        currency: currency,
        status: true,
        min-contrib: min-contrib,
        max-contrib: max-contrib,
        campaign-type: campaign-type,
        start-time: start-time,
        end-time: end-time,
        funding-threshold: funding-threshold,
        refund-policy: refund-policy,
        voting-period: voting-period
      }
    )
    (map-set campaigns-by-title title next-id)
    (var-set next-campaign-id (+ next-id u1))
    (print { event: "campaign-created", id: next-id })
    (ok next-id)
  )
)

(define-public (update-campaign
  (campaign-id uint)
  (update-title (string-utf8 100))
  (update-goal uint)
  (update-deadline uint)
)
  (let ((campaign (map-get? campaigns campaign-id)))
    (match campaign
      c
        (begin
          (asserts! (is-eq (get creator c) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-title update-title))
          (try! (validate-goal update-goal))
          (try! (validate-deadline update-deadline))
          (let ((existing (map-get? campaigns-by-title update-title)))
            (match existing
              existing-id
                (asserts! (is-eq existing-id campaign-id) (err ERR-CAMPAIGN-ALREADY-EXISTS))
              (begin true)
            )
          )
          (let ((old-title (get title c)))
            (if (is-eq old-title update-title)
                (ok true)
                (begin
                  (map-delete campaigns-by-title old-title)
                  (map-set campaigns-by-title update-title campaign-id)
                  (ok true)
                )
            )
          )
          (map-set campaigns campaign-id
            {
              title: update-title,
              description: (get description c),
              goal: update-goal,
              deadline: update-deadline,
              raised: (get raised c),
              timestamp: block-height,
              creator: (get creator c),
              category: (get category c),
              reward-tiers: (get reward-tiers c),
              location: (get location c),
              currency: (get currency c),
              status: (get status c),
              min-contrib: (get min-contrib c),
              max-contrib: (get max-contrib c),
              campaign-type: (get campaign-type c),
              start-time: (get start-time c),
              end-time: (get end-time c),
              funding-threshold: (get funding-threshold c),
              refund-policy: (get refund-policy c),
              voting-period: (get voting-period c)
            }
          )
          (map-set campaign-updates campaign-id
            {
              update-title: update-title,
              update-goal: update-goal,
              update-deadline: update-deadline,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "campaign-updated", id: campaign-id })
          (ok true)
        )
      (err ERR-CAMPAIGN-NOT-FOUND)
    )
  )
)

(define-public (close-campaign (campaign-id uint))
  (let ((campaign (map-get? campaigns campaign-id)))
    (match campaign
      c
        (begin
          (asserts! (is-eq (get creator c) tx-sender) (err ERR-NOT-AUTHORIZED))
          (asserts! (get status c) (err ERR-INVALID-STATUS))
          (map-set campaigns campaign-id
            (merge c { status: false })
          )
          (print { event: "campaign-closed", id: campaign-id })
          (ok true)
        )
      (err ERR-CAMPAIGN-NOT-FOUND)
    )
  )
)

(define-public (get-campaign-count)
  (ok (var-get next-campaign-id))
)

(define-public (check-campaign-existence (title (string-utf8 100)))
  (ok (is-campaign-registered title))
)

(define-public (get-campaign-raised (id uint))
  (match (map-get? campaigns id)
    c (ok (get raised c))
    (err ERR-CAMPAIGN-NOT-FOUND)
  )
)

(define-public (update-campaign-raised (id uint) (amount uint))
  (let ((campaign (map-get? campaigns id)))
    (match campaign
      c
        (begin
          (asserts! (is-eq (get creator c) tx-sender) (err ERR-NOT-AUTHORIZED))
          (map-set campaigns id
            (merge c { raised: (+ (get raised c) amount) })
          )
          (ok true)
        )
      (err ERR-CAMPAIGN-NOT-FOUND)
    )
  )
)