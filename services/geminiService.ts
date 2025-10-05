import { GoogleGenAI, Type, GenerateContentResponse, Chat, Part, FunctionDeclaration, Modality, LiveServerMessage } from "@google/genai";
import { SheetData, CellData, FileAttachment, CellStyle } from '../types.ts';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getAiContext = (sheetData: SheetData, selection: { startRow: number, endRow: number, startCol: number, endCol: number }): string => {
    // Provide a summary of the sheet by taking the first few rows (especially headers)
    const headerData = sheetData.slice(0, 10).map(row => 
        row.slice(0, 26).map(cell => cell?.value || '').join(',')
    ).join('\n');

    // Provide the user's current selection with style information
    const selectionData = sheetData.slice(selection.startRow, selection.endRow + 1).map(row => 
        row.slice(selection.startCol, selection.endCol + 1).map(cell => {
            if (!cell) return null;
            
            const cellJson: {v: string; s?: Partial<CellStyle>} = { v: cell.value };
            if (cell.style && Object.keys(cell.style).length > 0) {
                 cellJson.s = cell.style;
            }
            return cellJson;
        })
    );
    const selectionJson = JSON.stringify(selectionData, null, 2);

    return `
Here is a summary of the first 10 rows of the sheet to give you context on its structure (CSV format):
\`\`\`csv
${headerData}
\`\`\`

Here is the user's current selection of the sheet data in JSON format (from row ${selection.startRow + 1} to ${selection.endRow + 1}).
Each cell is an object: {"v": "value", "s": { ...style_properties... } }. The style property 's' is optional.
\`\`\`json
${selectionJson}
\`\`\`
`;
};

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        reasoning: {
            type: Type.STRING,
            description: "A detailed explanation of your thought process. Reference the user's past prompts if relevant. Outline your multi-step plan here."
        },
        steps: {
            type: Type.ARRAY,
            description: "A step-by-step list of the actions you will perform. This will be shown to the user.",
            items: { type: Type.STRING }
        },
        actions: {
            type: Type.ARRAY,
            description: "A list of actions to perform on the spreadsheet. Break complex tasks into multiple, smaller actions in this array.",
            items: {
                type: Type.OBJECT,
                properties: {
                    actionType: {
                        type: Type.STRING,
                        description: "Type of action: 'UPDATE_CELLS', 'CREATE_CHART', 'INFO', 'APPLY_STYLE', 'ADD_COMMENT', 'SORT_RANGE', 'INSERT_ROWS', 'DELETE_ROWS', 'INSERT_COLS', 'DELETE_COLS', 'ADD_SHEET', 'RENAME_SHEET', 'DELETE_SHEET', 'MERGE_CELLS', 'UNMERGE_CELLS', 'SET_ROW_HEIGHT', 'SET_COL_WIDTH'."
                    },
                    payload: {
                        type: Type.OBJECT,
                        description: "Data for the action. Populate only the fields relevant to the actionType.",
                        properties: {
                            updates: {
                                type: Type.ARRAY,
                                description: "For UPDATE_CELLS. An array of {row, col, value} objects. Coordinates are ABSOLUTE (0-indexed) to the entire sheet. For example, to update cell B3, use {row: 2, col: 1, value: 'New Value'}.",
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        row: { type: Type.INTEGER },
                                        col: { type: Type.INTEGER },
                                        value: { type: Type.STRING }
                                    }
                                }
                            },
                             chartConfig: {
                                type: Type.OBJECT,
                                description: "For CREATE_CHART. A valid Chart.js configuration object.",
                                properties: {
                                    type: { type: Type.STRING, description: "e.g. 'bar', 'line', 'pie', 'doughnut', 'polarArea', 'radar'" },
                                    data: {
                                        type: Type.OBJECT, properties: {
                                            labels: { type: Type.ARRAY, items: { type: Type.STRING } },
                                            datasets: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, data: { type: Type.ARRAY, items: { type: Type.NUMBER } }, backgroundColor: { type: Type.ARRAY, items: { type: Type.STRING } } } } }
                                        }
                                    },
                                    options: { type: Type.OBJECT, properties: { responsive: { type: Type.BOOLEAN }, plugins: { type: Type.OBJECT, properties: { title: {type: Type.OBJECT, properties: { display: {type: Type.BOOLEAN}, text: {type: Type.STRING}}}} } } }
                                }
                            },
                            text: { type: Type.STRING, description: "For INFO. A text-based answer to the user's query. Use Markdown for formatting (e.g., lists, bold). For ADD_COMMENT, this is the comment content." },
                            range: { type: Type.STRING, description: "For APPLY_STYLE, ADD_COMMENT, SORT_RANGE, MERGE_CELLS, and UNMERGE_CELLS. The A1 notation of the target range, e.g., 'A1:C10' or 'B2' for a single cell." },
                            style: {
                                type: Type.OBJECT,
                                description: "For APPLY_STYLE. A style object. Use hex colors.",
                                properties: {
                                    backgroundColor: { type: Type.STRING },
                                    color: { type: Type.STRING, description: "Text color, e.g. '#FFFFFF'" },
                                    fontWeight: { type: Type.STRING, description: "e.g., 'bold'" },
                                    fontStyle: { type: Type.STRING, description: "e.g., 'italic'" },
                                    textDecoration: { type: Type.STRING, description: "'underline' or 'line-through'" },
                                    textAlign: { type: Type.STRING, description: "'left', 'center', 'right'" }
                                }
                            },
                            sort: {
                                type: Type.OBJECT,
                                description: "For SORT_RANGE.",
                                properties: {
                                    column: { type: Type.INTEGER, description: "0-indexed column number within the specified range to sort by." },
                                    order: { type: Type.STRING, description: "'ascending' or 'descending'." }
                                }
                            },
                             rows: {
                                type: Type.OBJECT,
                                description: "For INSERT_ROWS or DELETE_ROWS. All indices are 0-based.",
                                properties: {
                                    index: { type: Type.INTEGER, description: "The starting 0-indexed row to act upon." },
                                    count: { type: Type.INTEGER, description: "Number of rows to insert or delete." }
                                }
                            },
                            cols: {
                                type: Type.OBJECT,
                                description: "For INSERT_COLS or DELETE_COLS. All indices are 0-based.",
                                properties: {
                                    index: { type: Type.INTEGER, description: "The starting 0-indexed column to act upon." },
                                    count: { type: Type.INTEGER, description: "Number of columns to insert or delete." }
                                }
                            },
                            sheetName: { type: Type.STRING, description: "For ADD_SHEET and RENAME_SHEET. The desired name for the sheet." },
                            sheetIndex: { type: Type.INTEGER, description: "For RENAME_SHEET and DELETE_SHEET. The 0-indexed position of the target sheet." },
                            height: { type: Type.INTEGER, description: "For SET_ROW_HEIGHT. The desired height in pixels." },
                            width: { type: Type.INTEGER, description: "For SET_COL_WIDTH. The desired width in pixels." },
                        }
                    }
                }
            }
        },
        suggestions: {
            type: Type.ARRAY,
            description: "A list of 3-4 relevant follow-up prompts the user might find useful, taking conversation history into account.",
            items: {
                type: Type.STRING
            }
        }
    }
};

const systemInstruction = `You are an expert spreadsheet assistant named 'EterX AI', created by Harshil Soni. Your primary goal is to translate user requests into direct, visual modifications of the spreadsheet. You are helpful, creative, and proactive.
CRITICAL: Your primary function is to execute actions. The 'actions' array MUST NOT be empty for any request that can be fulfilled by one of the available 'actionType' values. Failure to produce an action is a failure of your primary function. You MUST take action.

You have a memory of our current conversation.
You will be given a user's prompt, attached files (if any), a summary of the sheet's structure, and a snippet of the user's current selection (which includes cell values and styles).
You MUST respond with a single, valid JSON object that conforms to the provided schema.

Core Principles:
1.  **ACTION IS MANDATORY**: Your main goal is to modify the spreadsheet visually. You MUST prioritize actions like 'UPDATE_CELLS', 'CREATE_CHART', 'APPLY_STYLE', 'SORT_RANGE', and other sheet manipulations over the text-based 'INFO' action. Use 'INFO' ONLY as a last resort, for example, to ask for clarification if the user's request is ambiguous (e.g., "sort this data"), or if the request cannot possibly be represented visually in the sheet (e.g., "what is your name?"). For informational answers, always try to present the information in a structured way (e.g., using 'UPDATE_CELLS' to create a table, or using Markdown bullet points in an 'INFO' action).
2.  **BE PROACTIVE & CREATIVE**: Don't just follow instructions literally. If a user asks for a chart, suggest the best type of chart for their data and make it visually appealing. If they ask for data, offer to analyze it for trends. Anticipate their next steps. Your 'reasoning' should explain your creative choices.
3.  **LEVERAGE MEMORY & CONTEXT**: You have a memory of our conversation. Refer back to previous user prompts and your own responses to understand follow-up questions ("what about for last quarter?", "do that again but for column C"). Acknowledge this context in your 'reasoning' (e.g., "Based on your previous request to analyze sales...").
4.  **BREAK IT DOWN & COMMUNICATE**: For any non-trivial request, first formulate a plan in 'reasoning'. List user-friendly actions in 'steps'. Then, populate the 'actions' array. Crucially, your 'reasoning' should state what you are about to do, like a human would (e.g., "Okay, I am now creating a chart to visualize this data..."). When providing information or explanations in your 'reasoning' or 'INFO' actions, use bullet points or numbered lists to structure the content for clarity.
5.  **WEB-POWERED DATA CREATION**: If a user asks for data that isn't in the sheet (e.g., "create a table of country populations"), you MUST use the web search tool to find this information, then use 'UPDATE_CELLS' actions to populate the sheet with the results. Synthesize search results into a coherent plan.
6.  **VIBRANT & CREATIVE CHARTS**: When creating charts, be creative. Use diverse chart types and assign a vibrant, visually appealing palette of hex color codes via 'chartConfig.data.datasets.backgroundColor'. Make every chart easy to read and include a descriptive title.
7.  **CLARITY IS KEY**: If a user's request is ambiguous, you MUST ask for clarification using an 'INFO' action. Do not guess.
8.  **AESTHETIC AWARENESS**: When applying styles, especially colors, prioritize high contrast and readability. For a dark background, use a light text color, and vice-versa. Make your styling choices look professional and clean.
9.  **PROACTIVE SUGGESTIONS**: After completing a task, your 'suggestions' should anticipate the user's next logical step. For example, after creating a data table, suggest creating a chart or summarizing it. After sorting data, suggest highlighting the top/bottom values. Be a helpful partner.

Available 'actionType' values: 'UPDATE_CELLS', 'CREATE_CHART', 'INFO', 'APPLY_STYLE', 'ADD_COMMENT', 'SORT_RANGE', 'INSERT_ROWS', 'DELETE_ROWS', 'INSERT_COLS', 'DELETE_COLS', 'ADD_SHEET', 'RENAME_SHEET', 'DELETE_SHEET', 'MERGE_CELLS', 'UNMERGE_CELLS', 'SET_ROW_HEIGHT', 'SET_COL_WIDTH'.
- **IMPORTANT**: 'UPDATE_CELLS' coordinates ('row', 'col') MUST BE 0-indexed and ABSOLUTE to the entire sheet, NOT relative to the selection.`;

export const createChat = (): Chat => {
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
    });
};

export const getSearchBasedAiAnalysis = async (prompt: string, sheetData: SheetData, selection: any) => {
    const dataContext = getAiContext(sheetData, selection);
    const fullPrompt = `Based on the following data context (if relevant), answer the user's prompt. Provide sources if you use external information.
    ${dataContext}
    \n\nUser prompt: "${prompt}"`;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    return {
        text: response.text,
        citations: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
    };
};

export const needsWebSearch = async (prompt: string): Promise<boolean> => {
    // If the prompt includes file attachments, it's likely about the file content, not web search.
    if (prompt.includes("Attached file")) return false;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Does the following user prompt likely require up-to-date information from the web to be answered accurately?
            Examples requiring web search: "Who won the world cup in 2022?", "What are the latest tech stocks to watch?", "president of france", "current weather in New York", "population of major cities".
            Examples not requiring web search: "sum the first column", "make a bar chart from my data", "highlight all negative numbers", "who is the richest person on this list?".
            
            User prompt: "${prompt}"
            
            Respond with only "yes" or "no".`,
        });
        const decision = response.text.trim().toLowerCase();
        return decision.includes('yes');
    } catch (e) {
        console.error("Error in search decision:", e);
        return false;
    }
}

export const sendMessageToAi = async (chat: Chat, prompt: string, sheetData: SheetData, selection: any, attachments: FileAttachment[]) => {
    try {
        const dataContext = getAiContext(sheetData, selection);
        let textPrompt = `${dataContext}\n\nUser prompt: "${prompt}"`;
        
        const contentParts: Part[] = [];

        for (const file of attachments) {
            if (file.type === 'text') {
                textPrompt += `\n\nAttached file "${file.name}":\n\`\`\`\n${file.content}\n\`\`\``;
            } else if (file.type === 'image') {
                contentParts.push({
                    inlineData: {
                        mimeType: file.mimeType,
                        data: file.content
                    }
                });
            }
        }
        
        contentParts.unshift({ text: textPrompt });

        const response: GenerateContentResponse = await chat.sendMessage({ message: contentParts });
        
        const responseText = response.text;
        const parsedJson = JSON.parse(responseText);
        return parsedJson;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return {
            reasoning: "An error occurred while communicating with the AI. This may be due to a network issue or an invalid request. Please check your prompt and data, and try again. If the issue persists, the AI service may be temporarily unavailable.",
            steps: ["Error processing request."],
            actions: [{
                actionType: 'INFO',
                payload: { text: `**An error occurred:**\n\n\`\`\`\n${error instanceof Error ? error.message : String(error)}\n\`\`\`\n\nPlease try rephrasing your request or simplifying the task.` }
            }],
            suggestions: ["Try rephrasing your request.", "Check the data in your selection.", "Try a simpler request."],
        };
    }
};

export const getPredictiveFillSuggestions = async (sourceData: (string | undefined)[][], examples: (string | undefined)[]) => {
    const prompt = `You are a spreadsheet pattern-detection AI. Your task is to analyze source data and user-provided examples to determine a transformation pattern, then apply that pattern to the remaining source data.

    Here is the source data from one or more columns (provided as an array of rows):
    ${JSON.stringify(sourceData)}

    Here are the user's examples for the new column:
    ${JSON.stringify(examples)}

    Based on this, what would the values be for the rest of the rows in the new column?
    Provide ONLY the generated values for the remaining rows, starting from the first empty one.
    Do not include the user's examples in your response. The response must be a valid JSON object.
    For example, if the source is [["John"], ["Jane"]] and the examples are ["J"], your response for the second row should be {"predictions": ["J"]}.
    If the source is [["john.doe@example.com"], ["jane.doe@example.com"]] and examples are ["john.doe"], your response for the second row should be {"predictions": ["jane.doe"]}.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        predictions: {
                            type: Type.ARRAY,
                            description: "The predicted values for the remaining rows, as an array of strings.",
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        const result = JSON.parse(response.text);
        return result.predictions || [];
    } catch (e) {
        console.error("Failed to parse predictive fill response:", e);
        return [];
    }
};

// --- SMART FORMAT SERVICE ---
export const getSmartFormatSuggestions = async (sheetData: SheetData, selection: { startRow: number, endRow: number, startCol: number, endCol: number }) => {
    const selectionData = sheetData.slice(selection.startRow, selection.endRow + 1).map(row => 
        row.slice(selection.startCol, selection.endCol + 1).map(cell => cell?.value || '')
    );
    const selectionJson = JSON.stringify(selectionData, null, 2);
    
    const prompt = `You are a professional data stylist. Your task is to analyze the provided JSON data snippet from a spreadsheet selection and create a professional, visually appealing, and readable format for it.
    
    Data Snippet:
    \`\`\`json
    ${selectionJson}
    \`\`\`

    Based on the data's content and structure (e.g., headers, numbers, text), generate a series of 'APPLY_STYLE' actions to format it.

    Consider the following professional styling techniques:
    - **Headers:** Make the first row bold, with a subtle background color and contrasting text.
    - **Alternating Rows:** Apply a slightly different background color to every other row (zebra striping) for readability.
    - **Number Alignment:** Right-align columns that contain primarily numerical data.
    - **Text Alignment:** Left-align columns with text.
    - **Conditional Formatting (Simple):** If you see negative numbers, suggest a style to make them red.
    
    You MUST return a valid JSON object containing only a list of 'APPLY_STYLE' actions.
    `;
    
    const smartFormatSchema = {
        type: Type.OBJECT,
        properties: {
            actions: {
                type: Type.ARRAY,
                description: "A list of 'APPLY_STYLE' actions to format the data.",
                items: responseSchema.properties.actions.items
            }
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: smartFormatSchema
            }
        });
        const result = JSON.parse(response.text);
        return result.actions || [];
    } catch (e) {
        console.error("Failed to get smart format suggestions:", e);
        return [];
    }
};


// --- LIVE CONVERSATION SERVICE ---

const liveSystemInstruction = `You are EterX AI, a helpful and friendly spreadsheet assistant. You are in a live voice conversation. Your goal is to be conversational and natural. When the user asks you to perform an action, you MUST use the provided tools. Announce what you are doing as you do it (e.g., "Sure, I can sort that for you.") and confirm upon completion ("Done."). Keep your spoken responses concise, friendly, and helpful.`;

// Dynamically generate FunctionDeclarations from the responseSchema
const createLiveFunctionDeclarations = (): FunctionDeclaration[] => {
    const actionTypes = responseSchema.properties.actions.items.properties.actionType.description.match(/'(.*?)'/g).map(s => s.replace(/'/g, ''));
    const payloadProperties = responseSchema.properties.actions.items.properties.payload.properties;

    const declarations: FunctionDeclaration[] = [];
    
    // Manual mapping of action to its required payload properties
    const actionToPayloadMap: { [key: string]: string[] } = {
        'UPDATE_CELLS': ['updates'], 'CREATE_CHART': ['chartConfig'], 'INFO': ['text'],
        'APPLY_STYLE': ['range', 'style'], 'ADD_COMMENT': ['range', 'text'], 'SORT_RANGE': ['range', 'sort'],
        'INSERT_ROWS': ['rows'], 'DELETE_ROWS': ['rows'], 'INSERT_COLS': ['cols'], 'DELETE_COLS': ['cols'],
        'ADD_SHEET': ['sheetName'], 'RENAME_SHEET': ['sheetIndex', 'sheetName'], 'DELETE_SHEET': ['sheetIndex'],
        'MERGE_CELLS': ['range'], 'UNMERGE_CELLS': ['range'], 'SET_ROW_HEIGHT': ['range', 'height'], 'SET_COL_WIDTH': ['range', 'width']
    };

    actionTypes.forEach(actionType => {
        // We don't want the AI to use 'INFO' in voice mode, it should just speak.
        if(actionType === 'INFO') return;

        const requiredPayloads = actionToPayloadMap[actionType] || [];
        const properties: { [key: string]: any } = {};

        requiredPayloads.forEach(payloadKey => {
            if (payloadProperties[payloadKey]) {
                properties[payloadKey] = payloadProperties[payloadKey];
            }
        });

        declarations.push({
            name: actionType,
            description: `Performs the ${actionType} action on the spreadsheet.`,
            parameters: {
                type: Type.OBJECT,
                properties,
                required: requiredPayloads
            }
        });
    });

    return declarations;
};

export const functionDeclarations = createLiveFunctionDeclarations();

export const startLiveSession = (callbacks: {
    onopen: () => void;
    onmessage: (message: LiveServerMessage) => void;
    onerror: (e: ErrorEvent) => void;
    onclose: (e: CloseEvent) => void;
}) => {
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: liveSystemInstruction,
            tools: [{ functionDeclarations }],
        },
    });
};