
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useQueryClient } from "@tanstack/react-query";

import { useCart } from "../../context/CartContext";
import { checkoutCart,  verifyPayment, CheckoutCartResponse} from "@/lib/api/payment-api";
import { API_BASE_URL } from "../../constants/config";
import {
  COLORS,
  CARD_SHADOW,
  SOFT_SHADOW,
  PRIMARY_SHADOW,
  GRADIENTS,
} from "../../constants/theme";

export default function Payment() {
  const { items, total } = useCart();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [saveCard, setSaveCard] = useState(true);
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("09/28");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // The Razorpay order for this cart. Created once, as soon as the screen
  // mounts, so it's ready by the time the user taps Pay.
  const [order, setOrder] = useState<CheckoutCartResponse | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);
  const [prepError, setPrepError] = useState<string | null>(null);

  async function prepareOrder() {
    setIsPreparing(true);
    setPrepError(null);

    try {
      const result = await checkoutCart(); // no args -> checkout everything currently in the cart

      if (result.free) {
        // Nothing to pay for — already enrolled server-side.
        queryClient.invalidateQueries({ queryKey: ["cart"] });
        queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
        Alert.alert("You're enrolled!", "All the courses in your cart were free.", [
          { text: "OK", onPress: () => router.replace("/(student)/my-courses") },
        ]);
        return;
      }

      setOrder(result);
    } catch (err: any) {
      setPrepError(err?.response?.data?.message ?? "Couldn't start checkout. Please try again.");
    } finally {
      setIsPreparing(false);
    }
  }

  useEffect(() => {
    prepareOrder();
  }, []);

  // Opens Razorpay's hosted checkout page in an in-app browser (works in
  // Expo Go — no native SDK, no dev client) and waits for it to redirect
  // back with the payment result.
  async function handlePay() {
    if (isProcessing || isPreparing) return;

    if (prepError || !order?.razorpayOrderId) {
      prepareOrder();
      return;
    }

    setIsProcessing(true);

    try {
      const redirectUri = Linking.createURL("payment-callback");
      const checkoutUrl = `${API_BASE_URL}/payment/checkout-page/${order.razorpayOrderId}?redirect_uri=${encodeURIComponent(redirectUri)}`;

      const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, redirectUri);

      if (result.type !== "success" || !result.url) {
        // User closed the checkout page without paying.
        return;
      }

      const params = new URL(result.url).searchParams;
      const razorpayPaymentId = params.get("razorpay_payment_id");
      const razorpayOrderId = params.get("razorpay_order_id");
      const razorpaySignature = params.get("razorpay_signature");

      if (params.get("status") === "cancelled") return;

      if (params.get("status") === "failed") {
        Alert.alert("Payment failed", "Your card/UPI provider declined the payment. Please try again.");
        return;
      }

      if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
        Alert.alert("Something went wrong", "We couldn't confirm the payment. If money was deducted, it will be verified automatically shortly.");
        return;
      }

      await verifyPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature });

      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });

      Alert.alert("Payment successful!", "You're now enrolled.", [
        { text: "Start learning", onPress: () => router.replace("/(student)/my-courses") },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Payment couldn't be verified",
        err?.response?.data?.message ?? "Please check your enrollments — if you were charged, it will still go through via our webhook."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* =====================================================
          HEADER
      ===================================================== */}

      <LinearGradient
        colors={GRADIENTS[0]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.hero,
          {
            paddingTop: insets.top + 8,
          },
        ]}
      >
        {/* Decorative circles */}
        <View pointerEvents="none" style={styles.heroCircleOne} />
        <View pointerEvents="none" style={styles.heroCircleTwo} />

        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
            hitSlop={10}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Checkout</Text>
            <Text style={styles.headerSubtitle}>
              Complete your enrollment
            </Text>
          </View>

          <View style={styles.iconButton}>
            <Ionicons name="cart-outline" size={20} color="#fff" />

            {items.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{items.length}</Text>
              </View>
            )}
          </View>
        </View>

        {/* =====================================================
            STEPPER
        ===================================================== */}

        <View style={styles.stepper}>
          <View style={styles.stepDone}>
            <Ionicons
              name="checkmark"
              size={13}
              color={GRADIENTS[0][1]}
            />
          </View>

          <View style={[styles.stepLine, styles.stepLineActive]} />

          <View style={styles.stepActive}>
            <Text style={styles.stepActiveText}>2</Text>
          </View>

          <View style={styles.stepLine} />

          <View style={styles.stepUpcoming}>
            <Text style={styles.stepUpcomingText}>3</Text>
          </View>
        </View>

        <View style={styles.stepLabels}>
          <Text style={styles.stepLabel}>Cart</Text>
          <Text style={styles.stepLabelActive}>Payment</Text>
          <Text style={styles.stepLabelUpcoming}>Done</Text>
        </View>
      </LinearGradient>

      {/* =====================================================
          BODY
      ===================================================== */}

      <View style={styles.body}>
        <View pointerEvents="none" style={styles.blobTopRight} />
        <View pointerEvents="none" style={styles.blobBottomLeft} />

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* =================================================
              ORDER SUMMARY
          ================================================= */}

          <Pressable
            onPress={() => setSummaryExpanded((value) => !value)}
            style={({ pressed }) => [
              styles.summaryCard,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.summaryTop}>
              <LinearGradient
                colors={GRADIENTS[1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.summaryIcon}
              >
                <Ionicons
                  name="bag-handle-outline"
                  size={17}
                  color="#fff"
                />
              </LinearGradient>

              <View style={styles.summaryInfo}>
                <Text style={styles.summaryTitle}>Your order</Text>

                <Text style={styles.summarySubtitle}>
                  {items.length}{" "}
                  {items.length === 1 ? "course" : "courses"}
                </Text>
              </View>

              <View style={styles.summaryPriceBox}>
                <Text style={styles.summaryPrice}>₹{total}</Text>

                <View style={styles.summaryToggle}>
                  <Ionicons
                    name={
                      summaryExpanded
                        ? "chevron-up"
                        : "chevron-down"
                    }
                    size={14}
                    color={COLORS.primary}
                  />
                </View>
              </View>
            </View>

            {/* Expandable courses */}
            {summaryExpanded && (
              <View style={styles.summaryExpanded}>
                {items.map((course, index) => (
                  <View key={course.id} style={styles.courseRow}>
                    <View style={styles.courseDot}>
                      <Text style={styles.courseDotText}>
                        {index + 1}
                      </Text>
                    </View>

                    <Text
                      style={styles.courseTitle}
                      numberOfLines={1}
                    >
                      {course.title}
                    </Text>

                    <Text style={styles.coursePrice}>
                      {Number(course.price) <= 0
                        ? "Free"
                        : `₹${course.price}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Pressable>

          {/* =================================================
              SECURITY STRIP
          ================================================= */}

          <View style={styles.securityStrip}>
            <View style={styles.securityItem}>
              <View style={styles.securityIcon}>
                <Ionicons
                  name="shield-checkmark"
                  size={14}
                  color={COLORS.secondary}
                />
              </View>

              <Text style={styles.securityText}>
                Secure checkout
              </Text>
            </View>

            <View style={styles.securityDivider} />

            <View style={styles.securityItem}>
              <View style={styles.securityIcon}>
                <Ionicons
                  name="lock-closed"
                  size={13}
                  color={COLORS.secondary}
                />
              </View>

              <Text style={styles.securityText}>
                SSL protected
              </Text>
            </View>
          </View>

          {/* =================================================
              QUICK PAY
          ================================================= */}

          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.headingTitle}>Quick Pay</Text>

              <Text style={styles.headingSubtitle}>
                Faster ways to complete checkout
              </Text>
            </View>

            <View style={styles.fastBadge}>
              <Ionicons
                name="flash"
                size={11}
                color={COLORS.secondary}
              />

              <Text style={styles.fastBadgeText}>FAST</Text>
            </View>
          </View>

          <View style={styles.walletRow}>
            <Pressable
              onPress={handlePay}
              style={({ pressed }) => [
                styles.walletButton,
                styles.appleButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="logo-apple" size={18} color="#fff" />

              <Text style={styles.appleText}>Apple Pay</Text>

              <Ionicons
                name="arrow-up-right-box"
                size={15}
                color="rgba(255,255,255,0.55)"
              />
            </Pressable>

            <Pressable
              onPress={handlePay}
              style={({ pressed }) => [
                styles.walletButton,
                styles.googleButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="logo-google"
                size={16}
                color={COLORS.text}
              />

              <Text style={styles.googleText}>G Pay</Text>

              <Ionicons
                name="arrow-up-right-box"
                size={15}
                color={COLORS.muted}
              />
            </Pressable>
          </View>

          {/* =================================================
              CARD PAYMENT
          ================================================= */}

          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.headingTitle}>
                Card details
              </Text>

              <Text style={styles.headingSubtitle}>
                Entered securely on Razorpay's checkout
              </Text>
            </View>

            <View style={styles.cardSecureIcon}>
              <Ionicons
                name="card-outline"
                size={18}
                color={COLORS.primary}
              />
            </View>
          </View>

          {/* Card form */}
          <View style={styles.cardForm}>
            {/* Selected method */}
            <View style={styles.selectedMethod}>
              <View style={styles.selectedLeft}>
                <LinearGradient
                  colors={GRADIENTS[1]}
                  style={styles.selectedRadio}
                >
                  <Ionicons
                    name="checkmark"
                    size={12}
                    color="#fff"
                  />
                </LinearGradient>

                <View>
                  <Text style={styles.selectedTitle}>
                    Credit / Debit Card
                  </Text>

                  <Text style={styles.selectedSubtitle}>
                    Visa • Mastercard • Amex
                  </Text>
                </View>
              </View>

              <View style={styles.brandRow}>
                <View style={styles.brandPill}>
                  <Text style={styles.brandText}>VISA</Text>
                </View>

                <View style={styles.brandPill}>
                  <Text style={styles.brandText}>MC</Text>
                </View>
              </View>
            </View>

            {/* Card number */}
            <Text style={styles.fieldLabel}>CARD NUMBER</Text>

            <View style={styles.inputWrap}>
              <View style={styles.inputIconBox}>
                <Ionicons
                  name="card-outline"
                  size={17}
                  color={COLORS.primary}
                />
              </View>

              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={setCardNumber}
                placeholder="0000 0000 0000 0000"
                placeholderTextColor={COLORS.placeholder}
                keyboardType="number-pad"
                maxLength={19}
              />

              <View style={styles.detectedBrand}>
                <Text style={styles.detectedBrandText}>
                  VISA
                </Text>
              </View>
            </View>

            {/* Expiry + CVV */}
            <View style={styles.rowFields}>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>EXPIRES</Text>

                <View style={styles.inputWrap}>
                  <Ionicons
                    name="calendar-outline"
                    size={17}
                    color={COLORS.muted}
                    style={styles.smallInputIcon}
                  />

                  <TextInput
                    style={styles.input}
                    value={expiry}
                    onChangeText={setExpiry}
                    placeholder="MM/YY"
                    placeholderTextColor={COLORS.placeholder}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
              </View>

              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>CVC / CVV</Text>

                <View style={styles.inputWrap}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={17}
                    color={COLORS.muted}
                    style={styles.smallInputIcon}
                  />

                  <TextInput
                    style={styles.input}
                    value={cvv}
                    onChangeText={setCvv}
                    placeholder="•••"
                    placeholderTextColor={COLORS.placeholder}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                  />
                </View>
              </View>
            </View>

            {/* Name */}
            <Text style={styles.fieldLabel}>
              CARDHOLDER NAME
            </Text>

            <View style={styles.inputWrap}>
              <Ionicons
                name="person-outline"
                size={17}
                color={COLORS.muted}
                style={styles.smallInputIcon}
              />

              <TextInput
                style={styles.input}
                value={cardholderName}
                onChangeText={setCardholderName}
                placeholder="Name on card"
                placeholderTextColor={COLORS.placeholder}
                autoCapitalize="words"
              />
            </View>

            {/* Save card */}
            <View style={styles.saveRow}>
              <View style={styles.saveIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.saveText}>
                <Text style={styles.saveTitle}>
                  Save card securely
                </Text>

                <Text style={styles.saveSubtitle}>
                  Encrypted for future purchases
                </Text>
              </View>

              <Switch
                value={saveCard}
                onValueChange={setSaveCard}
                trackColor={{
                  false: COLORS.border,
                  true: COLORS.primarySoft,
                }}
                thumbColor={
                  saveCard ? COLORS.primary : "#fff"
                }
              />
            </View>
          </View>

          <View style={{ height: 25 }} />
        </ScrollView>
      </View>

      {/* =====================================================
          BOTTOM CHECKOUT BAR
      ===================================================== */}

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <View>
          <Text style={styles.totalLabel}>TOTAL</Text>

          <Text style={styles.totalValue}>₹{total}</Text>
        </View>

        <Pressable
          onPress={handlePay}
          disabled={isProcessing || isPreparing || !!prepError}
          style={({ pressed }) => [
            styles.payButtonOuter,
            pressed &&
              !isProcessing &&
              styles.payButtonPressed,
          ]}
        >
          <LinearGradient
            colors={GRADIENTS[0]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.payButton,
              (isProcessing || isPreparing || prepError) && styles.payButtonDisabled,
            ]}
          >
            {isProcessing || isPreparing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <View style={styles.payIcon}>
                  <Ionicons
                    name="lock-closed"
                    size={12}
                    color={GRADIENTS[0][1]}
                  />
                </View>

                <View>
                  <Text style={styles.payText}>
                    {prepError ? "Try again" : "Pay & Start Learning"}
                  </Text>

                  <Text style={styles.paySubtext}>
                    Secure checkout via Razorpay
                  </Text>
                </View>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({
  /* ================= BASE ================= */

  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  body: {
    flex: 1,
    position: "relative",
    backgroundColor: COLORS.background,
  },

  /* ================= HERO ================= */

  hero: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    overflow: "hidden",
    ...PRIMARY_SHADOW,
  },

  heroCircleOne: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    right: -70,
    top: -70,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  heroCircleTwo: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    left: -55,
    bottom: -65,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },

  headerSubtitle: {
    fontSize: 10,
    color: "rgba(255,255,255,0.68)",
    marginTop: 2,
    fontWeight: "500",
  },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
  },

  cartBadge: {
    position: "absolute",
    right: -3,
    top: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  cartBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: GRADIENTS[0][1],
  },

  /* ================= STEPPER ================= */

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 26,
    marginBottom: 6,
  },

  stepDone: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  stepActive: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
  },

  stepActiveText: {
    fontSize: 11,
    fontWeight: "900",
    color: GRADIENTS[0][1],
  },

  stepUpcoming: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },

  stepUpcomingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
  },

  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  stepLineActive: {
    backgroundColor: "#fff",
  },

  stepLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },

  stepLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.62)",
    fontWeight: "600",
  },

  stepLabelActive: {
    fontSize: 9,
    color: "#fff",
    fontWeight: "800",
  },

  stepLabelUpcoming: {
    fontSize: 9,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
  },

  /* ================= BACKGROUND ================= */

  blobTopRight: {
    position: "absolute",
    top: -80,
    right: -100,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.32,
  },

  blobBottomLeft: {
    position: "absolute",
    bottom: 60,
    left: -110,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: COLORS.tertiaryLight,
    opacity: 0.22,
  },

  /* ================= CONTENT ================= */

  content: {
    flex: 1,
  },

  contentInner: {
    paddingHorizontal: 17,
    paddingTop: 17,
    paddingBottom: 20,
  },

  /* ================= SUMMARY ================= */

  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.035)",
    ...SOFT_SHADOW,
  },

  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  summaryInfo: {
    flex: 1,
  },

  summaryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  summarySubtitle: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 3,
  },

  summaryPriceBox: {
    alignItems: "flex-end",
  },

  summaryPrice: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.primary,
  },

  summaryToggle: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  summaryExpanded: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 12,
    paddingTop: 7,
  },

  courseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
  },

  courseDot: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  courseDotText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.primary,
  },

  courseTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.mutedDark,
    marginRight: 8,
  },

  coursePrice: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },

  /* ================= SECURITY ================= */

  securityStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    paddingVertical: 9,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.025)",
  },

  securityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  securityIcon: {
    width: 25,
    height: 25,
    borderRadius: 9,
    backgroundColor: COLORS.successBg,
    alignItems: "center",
    justifyContent: "center",
  },

  securityText: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.mutedDark,
  },

  securityDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
    marginHorizontal: 15,
  },

  /* ================= HEADINGS ================= */

  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 11,
    paddingHorizontal: 2,
  },

  headingTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },

  headingSubtitle: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 3,
  },

  fastBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },

  fastBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: COLORS.secondary,
    letterSpacing: 0.4,
  },

  cardSecureIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ================= QUICK PAY ================= */

  walletRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 21,
  },

  walletButton: {
    flex: 1,
    minHeight: 49,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 10,
  },

  appleButton: {
    backgroundColor: "#111",
    ...SOFT_SHADOW,
  },

  googleButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SOFT_SHADOW,
  },

  appleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },

  googleText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },

  /* ================= CARD FORM ================= */

  cardForm: {
    backgroundColor: COLORS.surface,
    borderRadius: 21,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.035)",
    ...SOFT_SHADOW,
  },

  selectedMethod: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginBottom: 16,
  },

  selectedLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  selectedRadio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  selectedTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },

  selectedSubtitle: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 2,
  },

  brandRow: {
    flexDirection: "row",
    gap: 4,
  },

  brandPill: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },

  brandText: {
    fontSize: 7,
    fontWeight: "900",
    color: COLORS.mutedDark,
  },

  /* ================= INPUTS ================= */

  fieldLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.muted,
    marginBottom: 6,
    letterSpacing: 0.7,
  },

  inputWrap: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceStrong,
    borderRadius: 13,
    paddingHorizontal: 11,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "transparent",
  },

  inputIconBox: {
    width: 29,
    height: 29,
    borderRadius: 9,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  smallInputIcon: {
    marginRight: 8,
  },

  input: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
    paddingVertical: 0,
  },

  detectedBrand: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },

  detectedBrandText: {
    fontSize: 8,
    fontWeight: "900",
    color: COLORS.primary,
  },

  rowFields: {
    flexDirection: "row",
    gap: 10,
  },

  fieldHalf: {
    flex: 1,
  },

  /* ================= SAVE CARD ================= */

  saveRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 13,
    marginTop: 1,
  },

  saveIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  saveText: {
    flex: 1,
    marginRight: 5,
  },

  saveTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },

  saveSubtitle: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 2,
  },

  /* ================= BOTTOM ================= */

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 17,
    paddingTop: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
    ...CARD_SHADOW,
  },

  totalLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: COLORS.muted,
    letterSpacing: 1,
  },

  totalValue: {
    fontSize: 21,
    fontWeight: "900",
    color: COLORS.text,
    marginTop: 1,
  },

  payButtonOuter: {
    borderRadius: 16,
    overflow: "hidden",
    ...PRIMARY_SHADOW,
  },

  payButton: {
    minWidth: 190,
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
  },

  payButtonDisabled: {
    opacity: 0.7,
  },

  payButtonPressed: {
    transform: [{ scale: 0.98 }],
  },

  payIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },

  payText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },

  paySubtext: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 8,
    fontWeight: "600",
    marginTop: 2,
  },

  /* ================= INTERACTION ================= */

  pressed: {
    opacity: 0.78,
  },

  cardPressed: {
    transform: [{ scale: 0.995 }],
    opacity: 0.97,
  },
});
