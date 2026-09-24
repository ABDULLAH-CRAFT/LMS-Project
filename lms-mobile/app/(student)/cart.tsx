import {
  Text,
  View,
  StyleSheet,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ShoppingCart,
  ShieldCheck,
  Lock,
  Check,
  BookOpen,
  Zap,
  ChevronRight,
} from "lucide-react-native";

import ScreenContainer from "../../components/ScreenContainer";
import { useCart } from "../../context/CartContext";
import {
  COLORS,
  CARD_SHADOW,
  PRIMARY_SHADOW,
} from "../../constants/theme";

export default function Cart() {
  const { items, removeFromCart, total } = useCart();
  const router = useRouter();

  /*
   * EMPTY CART
   */
  if (items.length === 0) {
    return (
      <ScreenContainer title="Shopping Cart" scroll>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <ShoppingCart
              size={30}
              color={COLORS.primary}
              strokeWidth={2}
            />
          </View>

          <Text style={styles.emptyTitle}>Your cart is empty</Text>

          <Text style={styles.emptyDescription}>
            Explore our courses and add something to your learning journey.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.browseButton,
              pressed && styles.browseButtonPressed,
            ]}
            onPress={() => router.push("/(student)/browse")}
          >
            <Text style={styles.browseButtonText}>Browse Courses</Text>

            <ChevronRight
              size={18}
              color="#fff"
              strokeWidth={2.5}
            />
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Shopping Cart" scroll>
      <View style={styles.container}>
        {/* =========================================================
            HEADER
        ========================================================= */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.eyebrow}>YOUR SELECTION</Text>

            <Text style={styles.pageTitle}>
              Review your courses
            </Text>

            <Text style={styles.pageSubtitle}>
              {items.length}{" "}
              {items.length === 1 ? "course" : "courses"} selected
            </Text>
          </View>

          <View style={styles.cartIcon}>
            <ShoppingCart
              size={21}
              color={COLORS.text}
              strokeWidth={2}
            />

            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>
                {items.length}
              </Text>
            </View>
          </View>
        </View>

        {/* =========================================================
            CHECKOUT PROGRESS
        ========================================================= */}
        <View style={styles.progressCard}>
          <View style={styles.progressStep}>
            <View style={styles.progressCircleDone}>
              <Check
                size={13}
                color="#fff"
                strokeWidth={3}
              />
            </View>

            <Text style={styles.progressActiveText}>
              Cart
            </Text>
          </View>

          <View style={styles.progressLineActive} />

          <View style={styles.progressStep}>
            <View style={styles.progressCircleActive}>
              <Text style={styles.progressNumberActive}>
                2
              </Text>
            </View>

            <Text style={styles.progressActiveText}>
              Checkout
            </Text>
          </View>

          <View style={styles.progressLine} />

          <View style={styles.progressStep}>
            <View style={styles.progressCircle}>
              <Text style={styles.progressNumber}>
                3
              </Text>
            </View>

            <Text style={styles.progressText}>
              Done
            </Text>
          </View>
        </View>

        {/* =========================================================
            SECURITY CARD
        ========================================================= */}
        <View style={styles.securityCard}>
          <View style={styles.securityIcon}>
            <ShieldCheck
              size={18}
              color={COLORS.success}
              strokeWidth={2}
            />
          </View>

          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>
              Secure checkout
            </Text>

            <Text style={styles.securityDescription}>
              Your checkout information is securely handled.
            </Text>
          </View>

          <View style={styles.protectedBadge}>
            <Text style={styles.protectedText}>
              Protected
            </Text>
          </View>
        </View>

        {/* =========================================================
            SELECTED COURSES
        ========================================================= */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Selected Courses
            </Text>

            <Text style={styles.sectionSubtitle}>
              Review your learning selection
            </Text>
          </View>
        </View>

        <View style={styles.courseList}>
          {items.map((item) => (
            <View
              key={item.id}
              style={styles.courseCard}
            >
              {/* COURSE ICON */}
              <View style={styles.courseIcon}>
                <BookOpen
                  size={19}
                  color={COLORS.primary}
                  strokeWidth={2}
                />
              </View>

              {/* COURSE DETAILS */}
              <View style={styles.courseInfo}>
                <Text
                  style={styles.itemTitle}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>

                <View style={styles.courseMetaRow}>
                  <Text style={styles.itemMeta}>
                    Digital course
                  </Text>

                  <View style={styles.metaDot} />

                  <Text style={styles.itemMeta}>
                    Lifetime access
                  </Text>
                </View>

                <Pressable
                  onPress={() => removeFromCart(item.id)}
                  hitSlop={8}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeText}>
                    Remove
                  </Text>
                </Pressable>
              </View>

              {/* PRICE */}
              <View style={styles.priceContainer}>
                <Text style={styles.itemPrice}>
                  {Number(item.price) <= 0
                    ? "Free"
                    : `₹${item.price}`}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* =========================================================
            LEARNING ACCESS
        ========================================================= */}
        <View style={styles.learningCard}>
          <View style={styles.learningHeader}>
            <View style={styles.learningIcon}>
              <Zap
                size={18}
                color={COLORS.primary}
                strokeWidth={2}
              />
            </View>

            <View style={styles.learningHeaderText}>
              <Text style={styles.learningTitle}>
                Your learning access
              </Text>

              <Text style={styles.learningSubtitle}>
                Ready to unlock
              </Text>
            </View>
          </View>

          <Text style={styles.learningDescription}>
            Complete checkout to unlock your selected courses
            and continue learning from your student dashboard.
          </Text>

          <View style={styles.benefitsRow}>
            <View style={styles.benefitBox}>
              <BookOpen
                size={16}
                color={COLORS.primary}
                strokeWidth={2}
              />

              <Text style={styles.benefitTitle}>
                Course access
              </Text>

              <Text style={styles.benefitText}>
                Your courses appear in My Courses.
              </Text>
            </View>

            <View style={styles.benefitBox}>
              <Zap
                size={16}
                color={COLORS.secondary}
                strokeWidth={2}
              />

              <Text style={styles.benefitTitle}>
                Instant access
              </Text>

              <Text style={styles.benefitText}>
                Start learning after enrollment.
              </Text>
            </View>
          </View>
        </View>

        {/* =========================================================
            ORDER SUMMARY
        ========================================================= */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryTitle}>
                Order Summary
              </Text>

              <Text style={styles.summarySubtitle}>
                {items.length}{" "}
                {items.length === 1
                  ? "course"
                  : "courses"}{" "}
                in your order
              </Text>
            </View>

            <View style={styles.summaryIcon}>
              <ShoppingCart
                size={18}
                color={COLORS.primary}
                strokeWidth={2}
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* SUBTOTAL */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Subtotal
            </Text>

            <Text style={styles.summaryValue}>
              ₹{total}
            </Text>
          </View>

          {/* CHECKOUT */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Checkout
            </Text>

            <View style={styles.secureCheckoutBadge}>
              <ShieldCheck
                size={13}
                color={COLORS.success}
                strokeWidth={2}
              />

              <Text style={styles.secureValue}>
                Secure
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* TOTAL */}
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>
                Total amount
              </Text>

              <Text style={styles.totalHint}>
                Final amount
              </Text>
            </View>

            <Text style={styles.totalValue}>
              ₹{total}
            </Text>
          </View>
        </View>

        {/* =========================================================
            CHECKOUT ACTION
        ========================================================= */}
        <View style={styles.actionCard}>
          <Pressable
            style={({ pressed }) => [
              styles.checkoutButton,
              pressed && styles.checkoutButtonPressed,
            ]}
            onPress={() =>
              router.push("/(student)/payment")
            }
          >
            <Lock
              size={16}
              color="#fff"
              strokeWidth={2.3}
            />

            <Text style={styles.checkoutButtonText}>
              Proceed to Checkout
            </Text>

            <ChevronRight
              size={17}
              color="#fff"
              strokeWidth={2.5}
            />
          </Pressable>

          <View style={styles.secureNoteRow}>
            <ShieldCheck
              size={13}
              color={COLORS.success}
              strokeWidth={2}
            />

            <Text style={styles.secureNote}>
              Secure checkout · Your payment is protected
            </Text>
          </View>
        </View>

        {/* EXTRA SPACE AT BOTTOM */}
        <View style={styles.bottomSpace} />
      </View>
    </ScreenContainer>
  );
}

/* =============================================================
   STYLES
============================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 18,
  },

  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: COLORS.primary,
    marginBottom: 5,
  },

  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
  },

  pageSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 5,
  },

  cartIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",

    ...CARD_SHADOW,
  },

  cartBadge: {
    position: "absolute",
    right: -3,
    top: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.background,
  },

  cartBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },

  /* PROGRESS */

  progressCard: {
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 14,

    ...CARD_SHADOW,
  },

  progressStep: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 48,
  },

  progressCircleDone: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },

  progressCircleActive: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft ?? "#E8F1FF",
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },

  progressCircle: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#EEF1F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },

  progressNumberActive: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
  },

  progressNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
  },

  progressActiveText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary,
  },

  progressText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.muted,
  },

  progressLineActive: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.primary,
    marginHorizontal: 3,
    marginBottom: 20,
  },

  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E3E7ED",
    marginHorizontal: 3,
    marginBottom: 20,
  },

  /* SECURITY */

  securityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 17,
    backgroundColor: COLORS.background,
    marginBottom: 24,

    ...CARD_SHADOW,
  },

  securityIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EAF8F1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 3,
  },

  securityDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.muted,
  },

  protectedBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: "#EAF8F1",
    marginLeft: 6,
  },

  protectedText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.success,
  },

  /* SECTION */

  sectionHeader: {
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },

  sectionSubtitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 3,
  },

  /* COURSES */

  courseList: {
    gap: 10,
    marginBottom: 20,
  },

  courseCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 13,
    borderRadius: 17,
    backgroundColor: COLORS.background,

    ...CARD_SHADOW,
  },

  courseIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  courseInfo: {
    flex: 1,
    paddingRight: 6,
  },

  itemTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: COLORS.text,
  },

  courseMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 6,
  },

  itemMeta: {
    fontSize: 9.5,
    color: COLORS.muted,
  },

  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.muted,
    marginHorizontal: 5,
  },

  removeButton: {
    alignSelf: "flex-start",
    marginTop: 8,
  },

  removeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D9534F",
  },

  priceContainer: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    minWidth: 55,
  },

  itemPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  /* LEARNING ACCESS */

  learningCard: {
    padding: 16,
    borderRadius: 19,
    backgroundColor: "#F4F8FF",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2ECFF",
  },

  learningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  learningIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#E4EEFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  learningHeaderText: {
    flex: 1,
  },

  learningTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  learningSubtitle: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: "700",
    marginTop: 2,
  },

  learningDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.muted,
    marginBottom: 14,
  },

  benefitsRow: {
    flexDirection: "row",
    gap: 9,
  },

  benefitBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 11,
    minHeight: 104,
  },

  benefitTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },

  benefitText: {
    fontSize: 9.5,
    lineHeight: 14,
    color: COLORS.muted,
  },

  /* SUMMARY */

  summaryCard: {
    padding: 16,
    borderRadius: 19,
    backgroundColor: COLORS.background,
    marginBottom: 14,

    ...CARD_SHADOW,
  },

  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },

  summarySubtitle: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 3,
  },

  summaryIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
  },

  divider: {
    height: 1,
    backgroundColor: "#E9EDF2",
    marginVertical: 14,
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4,
  },

  summaryLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },

  summaryValue: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },

  secureCheckoutBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  secureValue: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.success,
  },

  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  totalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  totalHint: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 2,
  },

  totalValue: {
    fontSize: 21,
    fontWeight: "900",
    color: COLORS.primary,
  },

  /* ACTION */

  actionCard: {
    padding: 13,
    borderRadius: 18,
    backgroundColor: COLORS.background,

    ...CARD_SHADOW,
  },

  checkoutButton: {
    minHeight: 51,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    gap: 9,

    ...PRIMARY_SHADOW,
  },

  checkoutButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },

  checkoutButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
  },

  secureNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    gap: 5,
  },

  secureNote: {
    fontSize: 9.5,
    color: COLORS.muted,
  },

  /* EMPTY STATE */

  emptyContainer: {
    flex: 1,
    minHeight: 600,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,

    ...CARD_SHADOW,
  },

  emptyTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },

  emptyDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 280,
  },

  browseButton: {
    marginTop: 22,
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,

    ...PRIMARY_SHADOW,
  },

  browseButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },

  browseButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },

  bottomSpace: {
    height: 35,
  },
});