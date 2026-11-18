package com.ccadro.shipment.service;

import java.text.Normalizer;
import java.util.*;

/**
 * Elastic-style multi-field weighted fuzzy search utility.
 */
public final class ElasticSearchSupport {

    private ElasticSearchSupport() {
    }

    public record WeightedField(String value, double weight) {
    }

    public static String normalize(String input) {
        if (input == null) {
            return "";
        }
        String folded = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replace('\u0111', 'd')
                .replace('\u0110', 'D');
        return folded.toLowerCase(Locale.ROOT).trim().replaceAll("\\s+", " ");
    }

    public static <T> List<T> filterAndRank(List<T> items, String query, java.util.function.Function<T, List<WeightedField>> extractor) {
        String normalizedQuery = normalize(query);
        if (normalizedQuery.isEmpty() || items == null) {
            return items == null ? List.of() : items;
        }
        String[] tokens = normalizedQuery.split("\\s+");

        record ScoredItem<E>(E item, double score) {
        }

        List<ScoredItem<T>> scored = new ArrayList<>();
        for (T item : items) {
            List<WeightedField> fields = extractor.apply(item);
            double score = scoreDocument(fields, normalizedQuery, tokens);
            if (score > 0.0) {
                scored.add(new ScoredItem<>(item, score));
            }
        }
        scored.sort((a, b) -> Double.compare(b.score(), a.score()));
        return scored.stream().map(ScoredItem::item).toList();
    }

    private static double scoreDocument(List<WeightedField> fields, String fullQuery, String[] tokens) {
        if (fields == null || fields.isEmpty()) {
            return 0.0;
        }
        double totalScore = 0.0;
        for (String token : tokens) {
            double bestTokenScore = 0.0;
            for (WeightedField wf : fields) {
                String value = normalize(wf.value());
                if (value.isEmpty()) {
                    continue;
                }
                double tokenScore = 0.0;
                if (value.equals(fullQuery)) {
                    tokenScore = 10.0 * wf.weight();
                } else if (value.equals(token)) {
                    tokenScore = 8.0 * wf.weight();
                } else if (value.startsWith(token)) {
                    tokenScore = 6.0 * wf.weight();
                } else if (value.contains(token)) {
                    tokenScore = 4.0 * wf.weight();
                } else if (token.length() >= 3) {
                    for (String word : value.split("[\\s,._/@-]+")) {
                        if (word.isEmpty()) {
                            continue;
                        }
                        if (word.startsWith(token)) {
                            tokenScore = Math.max(tokenScore, 5.5 * wf.weight());
                        } else {
                            int dist = levenshtein(token, word);
                            int maxDist = token.length() >= 6 ? 2 : 1;
                            if (dist <= maxDist) {
                                tokenScore = Math.max(tokenScore, (2.5 / (1.0 + dist)) * wf.weight());
                            }
                        }
                    }
                }
                if (tokenScore > bestTokenScore) {
                    bestTokenScore = tokenScore;
                }
            }
            if (bestTokenScore <= 0.0) {
                return 0.0;
            }
            totalScore += bestTokenScore;
        }
        return totalScore;
    }

    private static int levenshtein(String a, String b) {
        if (Math.abs(a.length() - b.length()) > 2) {
            return 3;
        }
        int[] dp = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) {
            dp[j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            int prev = dp[0];
            dp[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int temp = dp[j];
                if (a.charAt(i - 1) == b.charAt(j - 1)) {
                    dp[j] = prev;
                } else {
                    dp[j] = 1 + Math.min(prev, Math.min(dp[j - 1], dp[j]));
                }
                prev = temp;
            }
        }
        return dp[b.length()];
    }
}

