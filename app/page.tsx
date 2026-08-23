"use client";

import React, { useId } from "react";

interface DonorToPatientHeroProps {
  className?: string;
}

export default function DonorToPatientHero({
  className = "",
}: DonorToPatientHeroProps) {
  const uid = useId().replace(/:/g, "");

  const ids = {
    bagClip: `bagClip-${uid}`,
    leftFlow: `leftFlow-${uid}`,
    rightFlow: `rightFlow-${uid}`,
  };

  return (
    <div className={`dtp-wrap ${className}`}>
      <svg
        className="dtp-hero"
        viewBox="0 0 1500 900"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Animated blood donation illustration"
      >
        <defs>
          {/* =========================================================
              BAG CLIP
          ========================================================== */}
          <clipPath id={ids.bagClip}>
            <path
              d="
                M675 276
                C645 280 630 300 630 330
                L630 575
                C630 610 645 625 680 625
                L820 625
                C855 625 870 610 870 575
                L870 330
                C870 300 855 280 825 276
                Z
              "
            />
          </clipPath>

          {/* =========================================================
              LEFT BLOOD FLOW PATH
          ========================================================== */}
          <path
            id={ids.leftFlow}
            d="
              M190 515
              C250 515 290 545 335 590
              C390 645 425 700 505 715
              C560 725 625 725 685 715
            "
          />

          {/* =========================================================
              RIGHT BLOOD FLOW PATH
          ========================================================== */}
          <path
            id={ids.rightFlow}
            d="
              M815 715
              C875 725 940 725 995 715
              C1075 700 1110 645 1165 590
              C1210 545 1250 515 1310 515
            "
          />
        </defs>

        {/* ============================================================
            BACKGROUND
        ============================================================ */}

        <rect
          x="0"
          y="0"
          width="1500"
          height="900"
          fill="#FFFDF5"
        />

        {/* ============================================================
            LEFT BED
        ============================================================ */}

        <g className="draw left-bed">
          <path
            d="M38 580H300V680H38"
            fill="#FFFDF5"
            stroke="#111"
            strokeWidth="7"
          />

          <path
            d="M38 580H300"
            stroke="#111"
            strokeWidth="7"
            strokeLinecap="round"
          />

          <path
            d="M38 680H300"
            stroke="#111"
            strokeWidth="7"
            strokeLinecap="round"
          />

          <path
            d="M235 680V770"
            stroke="#111"
            strokeWidth="7"
          />
        </g>

        {/* ============================================================
            RIGHT BED
        ============================================================ */}

        <g className="draw right-bed">
          <path
            d="M1200 580H1462V680H1200"
            fill="#FFFDF5"
            stroke="#111"
            strokeWidth="7"
          />

          <path
            d="M1200 580H1462"
            stroke="#111"
            strokeWidth="7"
            strokeLinecap="round"
          />

          <path
            d="M1200 680H1462"
            stroke="#111"
            strokeWidth="7"
            strokeLinecap="round"
          />

          <path
            d="M1265 680V770"
            stroke="#111"
            strokeWidth="7"
          />
        </g>

        {/* ============================================================
            LEFT HAND
            Same composition/style as supplied image
        ============================================================ */}

        <g className="hand-group left-hand">
          {/* wrist/arm horizontal */}
          <path
            className="draw"
            d="
              M38 468
              C125 468 205 468 275 463
              C300 461 314 447 329 420
            "
            fill="none"
            stroke="#111"
            strokeWidth="7"
            strokeLinecap="round"
          />

          {/* palm + fingers */}
          <path
            className="draw hand-outline"
            d="
              M329 420

              C346 391 369 363 381 365
              C395 367 390 389 375 415

              C398 385 421 360 437 365
              C452 370 442 397 425 425

              C448 397 466 379 480 389
              C493 399 478 421 460 440

              C484 418 499 411 507 423
              C516 437 499 456 479 474

              C453 498 423 510 387 508

              C345 506 312 491 276 480

              C245 470 215 469 190 468

              L38 468
            "
            fill="#FFFDF5"
            stroke="#111"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* palm internal curves */}
          <path
            className="draw inner-line"
            d="
              M350 428
              C365 436 374 447 368 460

              M395 417
              C407 430 414 442 405 455

              M440 420
              C451 432 456 442 448 453

              M332 457
              C350 463 366 467 383 466
            "
            fill="none"
            stroke="#111"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* wrist connector */}
          <g className="draw wrist-tag">
            <rect
              x="160"
              y="484"
              width="58"
              height="54"
              rx="8"
              fill="#FFFDF5"
              stroke="#111"
              strokeWidth="7"
            />

            <path
              d="M177 514H201"
              stroke="#111"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>
        </g>

        {/* ============================================================
            RIGHT HAND
            Mirror composition
        ============================================================ */}

        <g className="hand-group right-hand">
          {/* arm */}
          <path
            className="draw"
            d="
              M1462 468
              C1375 468 1295 468 1225 463
              C1200 461 1186 447 1171 420
            "
            fill="none"
            stroke="#111"
            strokeWidth="7"
            strokeLinecap="round"
          />

          {/* palm + fingers */}
          <path
            className="draw hand-outline"
            d="
              M1171 420

              C1154 391 1131 363 1119 365
              C1105 367 1110 389 1125 415

              C1102 385 1079 360 1063 365
              C1048 370 1058 397 1075 425

              C1052 397 1034 379 1020 389
              C1007 399 1022 421 1040 440

              C1016 418 1001 411 993 423
              C984 437 1001 456 1021 474

              C1047 498 1077 510 1113 508

              C1155 506 1188 491 1224 480

              C1255 470 1285 469 1310 468

              L1462 468
            "
            fill="#FFFDF5"
            stroke="#111"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* palm curves */}
          <path
            className="draw inner-line"
            d="
              M1150 428
              C1135 436 1126 447 1132 460

              M1105 417
              C1093 430 1086 442 1095 455

              M1060 420
              C1049 432 1044 442 1052 453

              M1168 457
              C1150 463 1134 467 1117 466
            "
            fill="none"
            stroke="#111"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* wrist connector */}
          <g className="draw wrist-tag">
            <rect
              x="1282"
              y="484"
              width="58"
              height="54"
              rx="8"
              fill="#FFFDF5"
              stroke="#111"
              strokeWidth="7"
            />

            <path
              d="M1299 514H1323"
              stroke="#111"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>
        </g>

        {/* ============================================================
            LEFT TUBE
        ============================================================ */}

        <path
          className="draw tube"
          d="
            M190 515
            C250 515 290 545 335 590
            C390 645 425 700 505 715
            C560 725 625 725 685 715
          "
          fill="none"
          stroke="#111"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* white tube inner */}
        <path
          className="tube-inner"
          d="
            M190 515
            C250 515 290 545 335 590
            C390 645 425 700 505 715
            C560 725 625 725 685 715
          "
          fill="none"
          stroke="#FFFDF5"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* red blood inside */}
        <path
          className="tube-blood"
          d="
            M190 515
            C250 515 290 545 335 590
            C390 645 425 700 505 715
            C560 725 625 725 685 715
          "
          fill="none"
          stroke="#D6303B"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="12 24"
        />

        {/* ============================================================
            RIGHT TUBE
        ============================================================ */}

        <path
          className="draw tube"
          d="
            M1310 515
            C1250 515 1210 545 1165 590
            C1110 645 1075 700 995 715
            C940 725 875 725 815 715
          "
          fill="none"
          stroke="#111"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          className="tube-inner"
          d="
            M1310 515
            C1250 515 1210 545 1165 590
            C1110 645 1075 700 995 715
            C940 725 875 725 815 715
          "
          fill="none"
          stroke="#FFFDF5"
          strokeWidth="6"
          strokeLinecap="round"
        />

        <path
          className="tube-blood right-blood"
          d="
            M1310 515
            C1250 515 1210 545 1165 590
            C1110 645 1075 700 995 715
            C940 725 875 725 815 715
          "
          fill="none"
          stroke="#D6303B"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="12 24"
        />

        {/* ============================================================
            LEFT BIG DROP
        ============================================================ */}

        <path
          className="blood-drop left-drop"
          d="
            M505 670
            C505 670 480 700 480 714
            C480 733 492 744 505 744
            C518 744 530 733 530 714
            C530 700 505 670 505 670
            Z
          "
          fill="#D6303B"
          stroke="#111"
          strokeWidth="5"
        />

        {/* ============================================================
            RIGHT BIG DROP
        ============================================================ */}

        <path
          className="blood-drop right-drop"
          d="
            M1000 670
            C1000 670 975 700 975 714
            C975 733 987 744 1000 744
            C1013 744 1025 733 1025 714
            C1025 700 1000 670 1000 670
            Z
          "
          fill="#D6303B"
          stroke="#111"
          strokeWidth="5"
        />

        {/* ============================================================
            MOVING BLOOD PARTICLES
        ============================================================ */}

        <g className="left-flow-particles">
          <circle r="7" fill="#D6303B">
            <animateMotion
              dur="2.4s"
              begin="1.7s"
              repeatCount="indefinite"
              path="
                M190 515
                C250 515 290 545 335 590
                C390 645 425 700 505 715
                C560 725 625 725 685 715
              "
            />
          </circle>

          <circle r="5" fill="#D6303B">
            <animateMotion
              dur="2.4s"
              begin="2.3s"
              repeatCount="indefinite"
              path="
                M190 515
                C250 515 290 545 335 590
                C390 645 425 700 505 715
                C560 725 625 725 685 715
              "
            />
          </circle>

          <circle r="4" fill="#D6303B">
            <animateMotion
              dur="2.4s"
              begin="2.9s"
              repeatCount="indefinite"
              path="
                M190 515
                C250 515 290 545 335 590
                C390 645 425 700 505 715
                C560 725 625 725 685 715
              "
            />
          </circle>
        </g>

        <g className="right-flow-particles">
          <circle r="7" fill="#D6303B">
            <animateMotion
              dur="2.4s"
              begin="3.7s"
              repeatCount="indefinite"
              path="
                M815 715
                C875 725 940 725 995 715
                C1075 700 1110 645 1165 590
                C1210 545 1250 515 1310 515
              "
            />
          </circle>

          <circle r="5" fill="#D6303B">
            <animateMotion
              dur="2.4s"
              begin="4.3s"
              repeatCount="indefinite"
              path="
                M815 715
                C875 725 940 725 995 715
                C1075 700 1110 645 1165 590
                C1210 545 1250 515 1310 515
              "
            />
          </circle>

          <circle r="4" fill="#D6303B">
            <animateMotion
              dur="2.4s"
              begin="4.9s"
              repeatCount="indefinite"
              path="
                M815 715
                C875 725 940 725 995 715
                C1075 700 1110 645 1165 590
                C1210 545 1250 515 1310 515
              "
            />
          </circle>
        </g>

        {/* ============================================================
            BLOOD BAG HOOK
        ============================================================ */}

        <g className="draw bag-hook">
          <path
            d="
              M715 276
              C715 238 728 214 750 214
              C772 214 785 238 785 276
            "
            fill="#FFFDF5"
            stroke="#111"
            strokeWidth="8"
          />

          <circle
            cx="750"
            cy="245"
            r="35"
            fill="#FFFDF5"
            stroke="#111"
            strokeWidth="8"
          />

          <circle
            cx="750"
            cy="245"
            r="16"
            fill="#FFFDF5"
            stroke="#111"
            strokeWidth="7"
          />
        </g>

        {/* ============================================================
            BLOOD BAG OUTLINE
        ============================================================ */}

        <path
          className="draw bag-outline"
          d="
            M675 276
            C645 280 630 300 630 330
            L630 575

            C630 610 645 625 680 625
            L820 625

            C855 625 870 610 870 575
            L870 330

            C870 300 855 280 825 276
            Z
          "
          fill="#FFFDF5"
          stroke="#111"
          strokeWidth="8"
          strokeLinejoin="round"
        />

        {/* ============================================================
            BAG BLOOD
        ============================================================ */}

        <g clipPath={`url(#${ids.bagClip})`}>
          <path
            className="bag-blood"
            d="
              M620 390
              C665 350 700 390 750 365
              C800 340 835 310 880 345
              L880 640
              L620 640
              Z
            "
            fill="#D6303B"
          />

          {/* moving surface */}
          <path
            className="bag-surface"
            d="
              M620 390
              C665 350 700 390 750 365
              C800 340 835 310 880 345
            "
            fill="none"
            stroke="#F45B63"
            strokeWidth="5"
          />
        </g>

        {/* ============================================================
            BAG LABEL
        ============================================================ */}

        <rect
          className="draw bag-label"
          x="680"
          y="385"
          width="140"
          height="150"
          rx="7"
          fill="#FFFDF5"
          stroke="#111"
          strokeWidth="7"
        />

        {/* blood icon */}
        <path
          className="label-blood"
          d="
            M750 405
            C750 405 730 435 730 448
            C730 462 739 472 750 472
            C761 472 770 462 770 448
            C770 435 750 405 750 405
            Z
          "
          fill="#D6303B"
        />

        {/* label lines */}
        <path
          d="M700 485H800"
          stroke="#111"
          strokeWidth="7"
          strokeLinecap="round"
        />

        <path
          d="M700 510H800"
          stroke="#111"
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* ============================================================
            BAG CONNECTORS
        ============================================================ */}

        <rect
          x="710"
          y="625"
          width="32"
          height="55"
          rx="4"
          fill="#FFFDF5"
          stroke="#111"
          strokeWidth="7"
        />

        <rect
          x="734"
          y="625"
          width="32"
          height="55"
          rx="4"
          fill="#FFFDF5"
          stroke="#111"
          strokeWidth="7"
        />

        <rect
          x="790"
          y="625"
          width="32"
          height="55"
          rx="4"
          fill="#FFFDF5"
          stroke="#111"
          strokeWidth="7"
        />

        {/* ============================================================
            CSS ANIMATION
        ============================================================ */}

        <style>{`
          .dtp-hero {
            width: 100%;
            height: auto;
            display: block;
          }

          /* =========================================
             DRAW EVERYTHING
          ========================================== */

          .draw {
            stroke-dasharray: 1600;
            stroke-dashoffset: 1600;
            animation:
              dtp-draw 1.25s cubic-bezier(.65,0,.35,1)
              forwards;
          }

          @keyframes dtp-draw {
            to {
              stroke-dashoffset: 0;
            }
          }

          .left-bed {
            animation-delay: .05s;
          }

          .right-bed {
            animation-delay: .12s;
          }

          .left-hand .hand-outline {
            animation-delay: .15s;
          }

          .right-hand .hand-outline {
            animation-delay: .2s;
          }

          .inner-line {
            animation-delay: .65s;
            animation-duration: .7s;
          }

          .wrist-tag {
            animation-delay: .75s;
            animation-duration: .55s;
          }

          .tube {
            animation-delay: .65s;
            animation-duration: 1s;
          }

          .bag-hook {
            animation-delay: .15s;
          }

          .bag-outline {
            animation-delay: .3s;
          }

          .bag-label {
            animation-delay: 1s;
            animation-duration: .7s;
          }

          /* =========================================
             DONOR HAND
          ========================================== */

          .left-hand {
            animation:
              donor-breathe 3.5s ease-in-out
              1.5s infinite;
          }

          @keyframes donor-breathe {
            0%,
            100% {
              transform: translateY(0);
            }

            50% {
              transform: translateY(-3px);
            }
          }

          /* =========================================
             RIGHT HAND RECEIVING
          ========================================== */

          .right-hand {
            transform-origin: center;
            animation:
              patient-breathe 3.5s ease-in-out
              4.5s infinite;
          }

          @keyframes patient-breathe {
            0%,
            100% {
              transform: translateY(0);
            }

            50% {
              transform: translateY(-3px);
            }
          }

          /* =========================================
             TUBE BLOOD FLOW
          ========================================== */

          .tube-blood {
            opacity: 0;
          }

          .left-hand ~ .tube-blood {
            animation:
              tube-flow-left 1.1s linear
              1.5s infinite;
          }

          .right-blood {
            animation:
              tube-flow-right 1.1s linear
              4s infinite;
          }

          @keyframes tube-flow-left {
            0% {
              opacity: 0;
              stroke-dashoffset: 50;
            }

            15% {
              opacity: 1;
            }

            100% {
              opacity: 1;
              stroke-dashoffset: -100;
            }
          }

          @keyframes tube-flow-right {
            0% {
              opacity: 0;
              stroke-dashoffset: 50;
            }

            15% {
              opacity: 1;
            }

            100% {
              opacity: 1;
              stroke-dashoffset: -100;
            }
          }

          /* =========================================
             BIG BLOOD DROPS
          ========================================== */

          .blood-drop {
            transform-box: fill-box;
            transform-origin: center;
            animation:
              drop-pulse 1.5s ease-in-out
              infinite;
          }

          .left-drop {
            animation-delay: 1.7s;
          }

          .right-drop {
            animation-delay: 4s;
          }

          @keyframes drop-pulse {
            0%,
            100% {
              transform: scale(1);
            }

            50% {
              transform: scale(1.08);
            }
          }

          /* =========================================
             BAG FILL
          ========================================== */

          .bag-blood {
            transform-box: fill-box;
            transform-origin: center bottom;

            transform:
              translateY(260px)
              scaleY(.02);

            animation:
              bag-fill 2s
              cubic-bezier(.45,0,.25,1)
              1.6s forwards;
          }

          @keyframes bag-fill {
            0% {
              transform:
                translateY(260px)
                scaleY(.02);
            }

            100% {
              transform:
                translateY(0)
                scaleY(1);
            }
          }

          .bag-surface {
            opacity: 0;

            animation:
              surface-show .5s ease
              3s forwards,
              surface-wave 2s ease-in-out
              3.5s infinite;
          }

          @keyframes surface-show {
            to {
              opacity: 1;
            }
          }

          @keyframes surface-wave {
            0%,
            100% {
              transform: translateX(-3px);
            }

            50% {
              transform: translateX(3px);
            }
          }

          /* =========================================
             BAG LABEL
          ========================================== */

          .label-blood {
            transform-box: fill-box;
            transform-origin: center;

            animation:
              label-pulse 1.5s
              ease-in-out
              3s infinite;
          }

          @keyframes label-pulse {
            0%,
            100% {
              transform: scale(1);
            }

            50% {
              transform: scale(1.12);
            }
          }

          /* =========================================
             FLOW PARTICLES
          ========================================== */

          .left-flow-particles {
            opacity: 0;

            animation:
              particles-left-show .3s
              ease forwards;
            animation-delay: 1.7s;
          }

          .right-flow-particles {
            opacity: 0;

            animation:
              particles-right-show .3s
              ease forwards;
            animation-delay: 3.8s;
          }

          @keyframes particles-left-show {
            to {
              opacity: 1;
            }
          }

          @keyframes particles-right-show {
            to {
              opacity: 1;
            }
          }

          /* =========================================
             MOBILE
          ========================================== */

          @media (max-width: 700px) {
            .dtp-hero {
              min-width: 760px;
              transform: translateX(-130px);
            }
          }

          /* =========================================
             REDUCED MOTION
          ========================================== */

          @media (prefers-reduced-motion: reduce) {
            .draw {
              animation: none !important;
              stroke-dashoffset: 0 !important;
            }

            .bag-blood {
              animation: none !important;
              transform:
                translateY(0)
                scaleY(1) !important;
            }

            .tube-blood {
              opacity: 1 !important;
              animation: none !important;
            }

            .left-flow-particles,
            .right-flow-particles {
              display: none;
            }

            .blood-drop,
            .label-blood,
            .left-hand,
            .right-hand {
              animation: none !important;
            }
          }
        `}</style>
      </svg>
    </div>
  );
}