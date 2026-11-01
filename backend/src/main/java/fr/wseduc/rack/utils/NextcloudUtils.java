package fr.wseduc.rack.utils;

import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.user.UserInfos;

public final class NextcloudUtils {

	private static final String NEXTCLOUD_VIEW_RIGHT = "fr.openent.nextcloud.controller.NextcloudController|view";

	private NextcloudUtils() {
	}

	public static boolean hasNextcloudViewRight(UserInfos user) {
		return user.getAuthorizedActions() != null && user.getAuthorizedActions().stream()
				.anyMatch(action -> NEXTCLOUD_VIEW_RIGHT.equals(action.getName()));
	}

	public static JsonArray toNextcloudFiles(JsonArray racks) {
		JsonArray files = new JsonArray();
		for (Object o : racks) {
			if (!(o instanceof JsonObject)) continue;
			JsonObject rack = (JsonObject) o;
			JsonObject metadata = rack.getJsonObject("metadata", new JsonObject()).copy();
			files.add(new JsonObject()
					.put("fileId", rack.getString("file"))
					.put("metadata", metadata.put("filename", toNextcloudFileName(rack, metadata))));
		}
		return files;
	}

	// Nextcloud refuses a name with a separator or a relative segment: build a valid one from the rack title.
	private static String toNextcloudFileName(JsonObject rack, JsonObject metadata) {
		String name = rack.getString("name");
		if (name == null || name.trim().isEmpty()) {
			name = metadata.getString("filename");
		}
		String fileName = name == null ? "" : name.trim().replaceAll("[/\\\\]", "-");
		boolean isValidName = !fileName.isEmpty() && !fileName.equals(".") && !fileName.equals("..");
		return isValidName ? fileName : "document";
	}
}
